package service

import (
	"context"
	"errors"
	"fmt"
	"strings"
	"time"

	"xorm.io/xorm"

	"github.com/grafana/grafana/pkg/components/simplejson"
	"github.com/grafana/grafana/pkg/events"
	"github.com/grafana/grafana/pkg/infra/db"
	"github.com/grafana/grafana/pkg/infra/log"
	"github.com/grafana/grafana/pkg/infra/metrics"
	ac "github.com/grafana/grafana/pkg/services/accesscontrol"
	"github.com/grafana/grafana/pkg/services/datasources"
	"github.com/grafana/grafana/pkg/services/quota"
	"github.com/grafana/grafana/pkg/services/sqlstore"
	"github.com/grafana/grafana/pkg/util"
)

// Store is the interface for the datasource Service's storage.
type Store interface {
	GetDataSource(context.Context, *datasources.GetDataSourceQuery) error
	GetDataSources(context.Context, *datasources.GetDataSourcesQuery) error
	GetDataSourcesByType(context.Context, *datasources.GetDataSourcesByTypeQuery) error
	GetDefaultDataSource(context.Context, *datasources.GetDefaultDataSourceQuery) error
	DeleteDataSource(context.Context, *datasources.DeleteDataSourceCommand) error
	AddDataSource(context.Context, *datasources.AddDataSourceCommand) error
	UpdateDataSource(context.Context, *datasources.UpdateDataSourceCommand) error
	GetAllDataSources(ctx context.Context, query *datasources.GetAllDataSourcesQuery) error

	Count(context.Context, *quota.ScopeParameters) (*quota.Map, error)
}

type SqlStore struct {
	db     db.DB
	logger log.Logger
}

func CreateStore(db db.DB, logger log.Logger) *SqlStore {
	return &SqlStore{db: db, logger: logger}
}

// GetDataSource adds a datasource to the query model by querying by org_id as well as
// either uid (preferred), id, or name and is added to the bus.
func (ss *SqlStore) GetDataSource(ctx context.Context, query *datasources.GetDataSourceQuery) error {
	metrics.MDBDataSourceQueryByID.Inc()

	return ss.db.WithDbSession(ctx, func(sess *db.Session) error {
		return ss.getDataSource(ctx, query, sess)
	})
}

func (ss *SqlStore) getDataSource(ctx context.Context, query *datasources.GetDataSourceQuery, sess *db.Session) error {
	if query.OrgID == 0 || (query.ID == 0 && len(query.Name) == 0 && len(query.UID) == 0) {
		return datasources.ErrDataSourceIdentifierNotSet
	}

	datasource := &datasources.DataSource{Name: query.Name, OrgID: query.OrgID, ID: query.ID, UID: query.UID}
	has, err := sess.Get(datasource)

	if err != nil {
		ss.logger.Error("Failed getting data source", "err", err, "uid", query.UID, "id", query.ID, "name", query.Name, "orgId", query.OrgID)
		return err
	} else if !has {
		return datasources.ErrDataSourceNotFound
	}

	query.Result = datasource

	return nil
}

func (ss *SqlStore) GetDataSources(ctx context.Context, query *datasources.GetDataSourcesQuery) error {
	var sess *xorm.Session
	return ss.db.WithDbSession(ctx, func(dbSess *db.Session) error {
		if query.DataSourceLimit <= 0 {
			sess = dbSess.Where("org_id=?", query.OrgID).Asc("name")
		} else {
			sess = dbSess.Limit(query.DataSourceLimit, 0).Where("org_id=?", query.OrgID).Asc("name")
		}

		query.Result = make([]*datasources.DataSource, 0)
		return sess.Find(&query.Result)
	})
}

func (ss *SqlStore) GetAllDataSources(ctx context.Context, query *datasources.GetAllDataSourcesQuery) error {
	return ss.db.WithDbSession(ctx, func(sess *db.Session) error {
		query.Result = make([]*datasources.DataSource, 0)
		return sess.Asc("name").Find(&query.Result)
	})
}

// GetDataSourcesByType returns all datasources for a given type or an error if the specified type is an empty string
func (ss *SqlStore) GetDataSourcesByType(ctx context.Context, query *datasources.GetDataSourcesByTypeQuery) error {
	if query.Type == "" {
		return fmt.Errorf("datasource type cannot be empty")
	}

	query.Result = make([]*datasources.DataSource, 0)
	return ss.db.WithDbSession(ctx, func(sess *db.Session) error {
		if query.OrgID > 0 {
			return sess.Where("type=? AND org_id=?", query.Type, query.OrgID).Asc("id").Find(&query.Result)
		}
		return sess.Where("type=?", query.Type).Asc("id").Find(&query.Result)
	})
}

// GetDefaultDataSource is used to get the default datasource of organization
func (ss *SqlStore) GetDefaultDataSource(ctx context.Context, query *datasources.GetDefaultDataSourceQuery) error {
	datasource := datasources.DataSource{}
	return ss.db.WithDbSession(ctx, func(sess *db.Session) error {
		exists, err := sess.Where("org_id=? AND is_default=?", query.OrgID, true).Get(&datasource)

		if !exists {
			return datasources.ErrDataSourceNotFound
		}

		query.Result = &datasource
		return err
	})
}

// DeleteDataSource removes a datasource by org_id as well as either uid (preferred), id, or name
// and is added to the bus. It also removes permissions related to the datasource.
func (ss *SqlStore) DeleteDataSource(ctx context.Context, cmd *datasources.DeleteDataSourceCommand) error {
	return ss.db.WithTransactionalDbSession(ctx, func(sess *db.Session) error {
		dsQuery := &datasources.GetDataSourceQuery{ID: cmd.ID, UID: cmd.UID, Name: cmd.Name, OrgID: cmd.OrgID}
		errGettingDS := ss.getDataSource(ctx, dsQuery, sess)

		if errGettingDS != nil && !errors.Is(errGettingDS, datasources.ErrDataSourceNotFound) {
			return errGettingDS
		}

		ds := dsQuery.Result
		if ds != nil {
			// Delete the data source
			result, err := sess.Exec("DELETE FROM data_source WHERE org_id=? AND id=?", ds.OrgID, ds.ID)
			if err != nil {
				return err
			}

			cmd.DeletedDatasourcesCount, _ = result.RowsAffected()

			// Remove associated AccessControl permissions
			if _, errDeletingPerms := sess.Exec("DELETE FROM permission WHERE scope=?",
				ac.Scope(datasources.ScopeProvider.GetResourceScope(dsQuery.Result.UID))); errDeletingPerms != nil {
				return errDeletingPerms
			}
		}

		if cmd.UpdateSecretFn != nil {
			if err := cmd.UpdateSecretFn(); err != nil {
				ss.logger.Error("Failed to update datasource secrets -- rolling back update", "UID", cmd.UID, "name", cmd.Name, "orgId", cmd.OrgID)
				return err
			}
		}

		// Publish data source deletion event
		if cmd.DeletedDatasourcesCount > 0 {
			sess.PublishAfterCommit(&events.DataSourceDeleted{
				Timestamp: time.Now(),
				Name:      ds.Name,
				ID:        ds.ID,
				UID:       ds.UID,
				OrgID:     ds.OrgID,
			})
		}

		return nil
	})
}

func (ss *SqlStore) Count(ctx context.Context, scopeParams *quota.ScopeParameters) (*quota.Map, error) {
	u := &quota.Map{}
	type result struct {
		Count int64
	}

	r := result{}
	if err := ss.db.WithDbSession(ctx, func(sess *sqlstore.DBSession) error {
		rawSQL := "SELECT COUNT(*) AS count FROM data_source"
		if _, err := sess.SQL(rawSQL).Get(&r); err != nil {
			return err
		}
		return nil
	}); err != nil {
		return u, err
	} else {
		tag, err := quota.NewTag(datasources.QuotaTargetSrv, datasources.QuotaTarget, quota.GlobalScope)
		if err != nil {
			return u, err
		}
		u.Set(tag, r.Count)
	}

	if scopeParams != nil && scopeParams.OrgID != 0 {
		if err := ss.db.WithDbSession(ctx, func(sess *sqlstore.DBSession) error {
			rawSQL := "SELECT COUNT(*) AS count FROM data_source WHERE org_id=?"
			if _, err := sess.SQL(rawSQL, scopeParams.OrgID).Get(&r); err != nil {
				return err
			}
			return nil
		}); err != nil {
			return u, err
		} else {
			tag, err := quota.NewTag(datasources.QuotaTargetSrv, datasources.QuotaTarget, quota.OrgScope)
			if err != nil {
				return u, err
			}
			u.Set(tag, r.Count)
		}
	}

	return u, nil
}

func (ss *SqlStore) AddDataSource(ctx context.Context, cmd *datasources.AddDataSourceCommand) error {
	return ss.db.WithTransactionalDbSession(ctx, func(sess *db.Session) error {
		existing := datasources.DataSource{OrgID: cmd.OrgID, Name: cmd.Name}
		has, _ := sess.Get(&existing)

		if has {
			return datasources.ErrDataSourceNameExists
		}

		if cmd.JsonData == nil {
			cmd.JsonData = simplejson.New()
		}

		if cmd.UID == "" {
			uid, err := generateNewDatasourceUid(sess, cmd.OrgID)
			if err != nil {
				return fmt.Errorf("failed to generate UID for datasource %q: %w", cmd.Name, err)
			}
			cmd.UID = uid
		}

		ds := &datasources.DataSource{
			OrgID:           cmd.OrgID,
			Name:            cmd.Name,
			Type:            cmd.Type,
			Access:          cmd.Access,
			URL:             cmd.URL,
			User:            cmd.User,
			Database:        cmd.Database,
			IsDefault:       cmd.IsDefault,
			BasicAuth:       cmd.BasicAuth,
			BasicAuthUser:   cmd.BasicAuthUser,
			WithCredentials: cmd.WithCredentials,
			JsonData:        cmd.JsonData,
			SecureJsonData:  cmd.EncryptedSecureJsonData,
			Created:         time.Now(),
			Updated:         time.Now(),
			Version:         1,
			ReadOnly:        cmd.ReadOnly,
			UID:             cmd.UID,
		}

		if _, err := sess.Insert(ds); err != nil {
			if ss.db.GetDialect().IsUniqueConstraintViolation(err) && strings.Contains(strings.ToLower(ss.db.GetDialect().ErrorMessage(err)), "uid") {
				return datasources.ErrDataSourceUidExists
			}
			return err
		}
		if err := updateIsDefaultFlag(ds, sess); err != nil {
			return err
		}

		if cmd.UpdateSecretFn != nil {
			if err := cmd.UpdateSecretFn(); err != nil {
				// ss.logger.Error("Failed to update datasource secrets -- rolling back update", "name", cmd.Name, "type", cmd.Type, "orgId", cmd.OrgID)
				return err
			}
		}

		cmd.Result = ds

		sess.PublishAfterCommit(&events.DataSourceCreated{
			Timestamp: time.Now(),
			Name:      cmd.Name,
			ID:        ds.ID,
			UID:       cmd.UID,
			OrgID:     cmd.OrgID,
		})
		return nil
	})
}

func updateIsDefaultFlag(ds *datasources.DataSource, sess *db.Session) error {
	// Handle is default flag
	if ds.IsDefault {
		rawSQL := "UPDATE data_source SET is_default=? WHERE org_id=? AND id <> ?"
		if _, err := sess.Exec(rawSQL, false, ds.OrgID, ds.ID); err != nil {
			return err
		}
	}
	return nil
}

func (ss *SqlStore) UpdateDataSource(ctx context.Context, cmd *datasources.UpdateDataSourceCommand) error {
	return ss.db.WithTransactionalDbSession(ctx, func(sess *db.Session) error {
		if cmd.JsonData == nil {
			cmd.JsonData = simplejson.New()
		}

		ds := &datasources.DataSource{
			ID:              cmd.ID,
			OrgID:           cmd.OrgID,
			Name:            cmd.Name,
			Type:            cmd.Type,
			Access:          cmd.Access,
			URL:             cmd.URL,
			User:            cmd.User,
			Database:        cmd.Database,
			IsDefault:       cmd.IsDefault,
			BasicAuth:       cmd.BasicAuth,
			BasicAuthUser:   cmd.BasicAuthUser,
			WithCredentials: cmd.WithCredentials,
			JsonData:        cmd.JsonData,
			SecureJsonData:  cmd.EncryptedSecureJsonData,
			Updated:         time.Now(),
			ReadOnly:        cmd.ReadOnly,
			Version:         cmd.Version + 1,
			UID:             cmd.UID,
		}

		sess.UseBool("is_default")
		sess.UseBool("basic_auth")
		sess.UseBool("with_credentials")
		sess.UseBool("read_only")
		// Make sure database field is zeroed out if empty. We want to migrate away from this field.
		sess.MustCols("database")
		// Make sure password are zeroed out if empty. We do this as we want to migrate passwords from
		// plain text fields to SecureJsonData.
		sess.MustCols("password")
		sess.MustCols("basic_auth_password")
		sess.MustCols("user")
		// Make sure secure json data is zeroed out if empty. We do this as we want to migrate secrets from
		// secure json data to the unified secrets table.
		sess.MustCols("secure_json_data")

		var updateSession *xorm.Session
		if cmd.Version != 0 {
			// the reason we allow cmd.version > db.version is make it possible for people to force
			// updates to datasources using the datasource.yaml file without knowing exactly what version
			// a datasource have in the db.
			updateSession = sess.Where("id=? and org_id=? and version < ?", ds.ID, ds.OrgID, ds.Version)
		} else {
			updateSession = sess.Where("id=? and org_id=?", ds.ID, ds.OrgID)
		}

		affected, err := updateSession.Update(ds)
		if err != nil {
			return err
		}

		if affected == 0 {
			return datasources.ErrDataSourceUpdatingOldVersion
		}

		err = updateIsDefaultFlag(ds, sess)

		if cmd.UpdateSecretFn != nil {
			if err := cmd.UpdateSecretFn(); err != nil {
				ss.logger.Error("Failed to update datasource secrets -- rolling back update", "UID", cmd.UID, "name", cmd.Name, "type", cmd.Type, "orgId", cmd.OrgID)
				return err
			}
		}

		cmd.Result = ds
		return err
	})
}

func generateNewDatasourceUid(sess *db.Session, orgId int64) (string, error) {
	for i := 0; i < 3; i++ {
		uid := generateNewUid()

		exists, err := sess.Where("org_id=? AND uid=?", orgId, uid).Get(&datasources.DataSource{})
		if err != nil {
			return "", err
		}

		if !exists {
			return uid, nil
		}
	}

	return "", datasources.ErrDataSourceFailedGenerateUniqueUid
}

var generateNewUid func() string = util.GenerateShortUID

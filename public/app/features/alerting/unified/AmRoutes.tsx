import { css } from '@emotion/css';
import React, { useCallback, useEffect, useMemo, useState } from 'react';

import { GrafanaTheme2 } from '@grafana/data';
import { Alert, LoadingPlaceholder, useStyles2, withErrorBoundary } from '@grafana/ui';
import { useDispatch } from 'app/types';

import { useCleanup } from '../../../core/hooks/useCleanup';

import { AlertManagerPicker } from './components/AlertManagerPicker';
import { AlertingPageWrapper } from './components/AlertingPageWrapper';
import { GrafanaAlertmanagerDeliveryWarning } from './components/GrafanaAlertmanagerDeliveryWarning';
import { NoAlertManagerWarning } from './components/NoAlertManagerWarning';
import { ProvisionedResource, ProvisioningAlert } from './components/Provisioning';
import { AmRootRoute } from './components/amroutes/AmRootRoute';
import { AmSpecificRouting } from './components/amroutes/AmSpecificRouting';
import { MuteTimingsTable } from './components/amroutes/MuteTimingsTable';
import { useGetAmRouteReceiverWithGrafanaAppTypes } from './components/receivers/grafanaAppReceivers/grafanaApp';
import { AmRouteReceiver } from './components/receivers/grafanaAppReceivers/types';
import { useAlertManagerSourceName } from './hooks/useAlertManagerSourceName';
import { useAlertManagersByPermission } from './hooks/useAlertManagerSources';
import { useUnifiedAlertingSelector } from './hooks/useUnifiedAlertingSelector';
import { fetchAlertManagerConfigAction, updateAlertManagerConfigAction } from './state/actions';
import { FormAmRoute } from './types/amroutes';
import { amRouteToFormAmRoute, formAmRouteToAmRoute } from './utils/amroutes';
import { isVanillaPrometheusAlertManagerDataSource } from './utils/datasource';
import { initialAsyncRequestState } from './utils/redux';

const AmRoutes = () => {
  const dispatch = useDispatch();

  const styles = useStyles2(getStyles);
  const [isRootRouteEditMode, setIsRootRouteEditMode] = useState(false);
  const alertManagers = useAlertManagersByPermission('notification');
  const [alertManagerSourceName, setAlertManagerSourceName] = useAlertManagerSourceName(alertManagers);

  const amConfigs = useUnifiedAlertingSelector((state) => state.amConfigs);

  const fetchConfig = useCallback(() => {
    if (alertManagerSourceName) {
      dispatch(fetchAlertManagerConfigAction(alertManagerSourceName));
    }
  }, [alertManagerSourceName, dispatch]);

  useEffect(() => {
    fetchConfig();
  }, [fetchConfig]);

  const {
    result,
    loading: resultLoading,
    error: resultError,
  } = (alertManagerSourceName && amConfigs[alertManagerSourceName]) || initialAsyncRequestState;

  const config = result?.alertmanager_config;
  const [rootRoute, id2ExistingRoute] = useMemo(() => amRouteToFormAmRoute(config?.route), [config?.route]);

  const receivers: AmRouteReceiver[] = useGetAmRouteReceiverWithGrafanaAppTypes(config?.receivers ?? []);

  const isProvisioned = useMemo(() => Boolean(config?.route?.provenance), [config?.route]);

  const enterRootRouteEditMode = () => {
    setIsRootRouteEditMode(true);
  };

  const exitRootRouteEditMode = () => {
    setIsRootRouteEditMode(false);
  };

  useCleanup((state) => (state.unifiedAlerting.saveAMConfig = initialAsyncRequestState));

  const handleSave = (data: Partial<FormAmRoute>) => {
    if (!result) {
      return;
    }

    const newData = formAmRouteToAmRoute(
      alertManagerSourceName,
      {
        ...rootRoute,
        ...data,
      },
      id2ExistingRoute
    );

    if (isRootRouteEditMode) {
      exitRootRouteEditMode();
    }

    dispatch(
      updateAlertManagerConfigAction({
        newConfig: {
          ...result,
          alertmanager_config: {
            ...result.alertmanager_config,
            route: newData,
          },
        },
        oldConfig: result,
        alertManagerSourceName: alertManagerSourceName!,
        successMessage: 'Saved',
        refetch: true,
      })
    );
  };

  if (!alertManagerSourceName) {
    return (
      <AlertingPageWrapper pageId="am-routes">
        <NoAlertManagerWarning availableAlertManagers={alertManagers} />
      </AlertingPageWrapper>
    );
  }

  const readOnly = alertManagerSourceName
    ? isVanillaPrometheusAlertManagerDataSource(alertManagerSourceName) || isProvisioned
    : true;

  return (
    <AlertingPageWrapper pageId="am-routes">
      <AlertManagerPicker
        current={alertManagerSourceName}
        onChange={setAlertManagerSourceName}
        dataSources={alertManagers}
      />
      {resultError && !resultLoading && (
        <Alert severity="error" title="Error loading Alertmanager config">
          {resultError.message || 'Unknown error.'}
        </Alert>
      )}
      <GrafanaAlertmanagerDeliveryWarning currentAlertmanager={alertManagerSourceName} />
      {isProvisioned && <ProvisioningAlert resource={ProvisionedResource.RootNotificationPolicy} />}
      {resultLoading && <LoadingPlaceholder text="Loading Alertmanager config..." />}
      {result && !resultLoading && !resultError && (
        <>
          <AmRootRoute
            readOnly={readOnly}
            alertManagerSourceName={alertManagerSourceName}
            isEditMode={isRootRouteEditMode}
            onSave={handleSave}
            onEnterEditMode={enterRootRouteEditMode}
            onExitEditMode={exitRootRouteEditMode}
            receivers={receivers}
            routes={rootRoute}
          />
          <div className={styles.break} />
          <AmSpecificRouting
            alertManagerSourceName={alertManagerSourceName}
            onChange={handleSave}
            readOnly={readOnly}
            onRootRouteEdit={enterRootRouteEditMode}
            receivers={receivers}
            routes={rootRoute}
          />
          <div className={styles.break} />
          <MuteTimingsTable alertManagerSourceName={alertManagerSourceName} />
        </>
      )}
    </AlertingPageWrapper>
  );
};

export default withErrorBoundary(AmRoutes, { style: 'page' });

const getStyles = (theme: GrafanaTheme2) => ({
  break: css`
    width: 100%;
    height: 0;
    margin-bottom: ${theme.spacing(2)};
  `,
});

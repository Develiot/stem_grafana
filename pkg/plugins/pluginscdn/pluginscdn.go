package pluginscdn

import (
	"errors"
	"fmt"
	"net/url"
	"path"

	"github.com/grafana/grafana/pkg/plugins/config"
)

const (
	// systemJSCDNKeyword is the path prefix used by system.js to identify the plugins CDN.
	systemJSCDNKeyword = "plugin-cdn"
)

var ErrPluginNotCDN = errors.New("plugin is not a cdn plugin")

// Service provides methods for the plugins CDN.
type Service struct {
	cfg *config.Cfg
}

func ProvideService(cfg *config.Cfg) *Service {
	return &Service{cfg: cfg}
}

// NewCDNURLConstructor returns a new URLConstructor for the provided plugin id and version.
// The CDN should be enabled for the plugin, otherwise the returned URLConstructor will have
// and invalid base url.
func (s *Service) NewCDNURLConstructor(pluginID, pluginVersion string) URLConstructor {
	return URLConstructor{
		cdnURLTemplate: s.cfg.PluginsCDNURLTemplate,
		pluginID:       pluginID,
		pluginVersion:  pluginVersion,
	}
}

// IsEnabled returns true if the plugins cdn is enabled.
func (s *Service) IsEnabled() bool {
	return s.cfg.PluginsCDNURLTemplate != ""
}

// PluginSupported returns true if the CDN is enabled in the config and if the specified plugin ID has CDN enabled.
func (s *Service) PluginSupported(pluginID string) bool {
	return s.IsEnabled() && s.cfg.PluginSettings[pluginID]["cdn"] != ""
}

// BaseURL returns the absolute base URL of the plugins CDN.
// If the plugins CDN is disabled, it returns an empty string.
func (s *Service) BaseURL() (string, error) {
	if !s.IsEnabled() {
		return "", nil
	}
	u, err := url.Parse(s.cfg.PluginsCDNURLTemplate)
	if err != nil {
		return "", fmt.Errorf("url parse: %w", err)
	}
	return u.Scheme + "://" + u.Host, nil
}

// SystemJSAssetPath returns a system-js path for the specified asset on the plugins CDN.
// It replaces the base path of the CDN with systemJSCDNKeyword.
// If assetPath is an empty string, the base path for the plugin is returned.
func (s *Service) SystemJSAssetPath(pluginID, pluginVersion, assetPath string) (string, error) {
	u, err := s.NewCDNURLConstructor(pluginID, pluginVersion).Path(assetPath)
	if err != nil {
		return "", err
	}
	return path.Join(systemJSCDNKeyword, u.Path), nil
}

// AssetURL returns the URL of a CDN asset for a CDN plugin. If the specified plugin is not a CDN plugin,
// it returns ErrPluginNotCDN.
func (s *Service) AssetURL(pluginID, pluginVersion, assetPath string) (string, error) {
	if !s.PluginSupported(pluginID) {
		return "", ErrPluginNotCDN
	}
	return s.NewCDNURLConstructor(pluginID, pluginVersion).StringPath(assetPath)
}

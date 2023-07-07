import React from 'react';

import { LinkTarget } from '@grafana/data';
import { config } from '@grafana/runtime';
import { Icon, IconName } from '@grafana/ui';
// import { t } from 'app/core/internationalization';

export interface FooterLink {
  target: LinkTarget;
  text: string;
  id: string;
  icon?: IconName;
  url?: string;
}

export let getFooterLinks = (): FooterLink[] => {
  return [
    // {
    //   target: '_blank',
    //   id: 'documentation',
    //   text: t('nav.help/documentation', 'Documentation'),
    //   icon: 'document-info',
    //   url: 'https://grafana.com/docs/grafana/latest/?utm_source=grafana_footer',
    // },
    // {
    //   target: '_blank',
    //   id: 'support',
    //   text: t('nav.help/support', 'Support'),
    //   icon: 'question-circle',
    //   url: 'https://grafana.com/products/enterprise/?utm_source=grafana_footer',
    // },
    {
      target: '_blank',
      id: 'community',
      text: 'stem-v0.3.0 (AGPLv3 license)',
      icon: 'github',
      url: 'https://github.com/Develiot/stem_grafana',
    },
    {
      target: '_blank',
      id: 'tbs',
      text: 'Telelink Business Services EAD',
      icon: 'tbs-logo',
      url: 'https://tbs.tech',
    },
  ];
};

export function getVersionMeta(version: string) {
  const isBeta = version.includes('-beta');

  return {
    hasReleaseNotes: true,
    isBeta,
  };
}

export let getVersionLinks = (): FooterLink[] => {
  const { buildInfo, licenseInfo } = config;
  const links: FooterLink[] = [];
  const stateInfo = licenseInfo.stateInfo ? ` (${licenseInfo.stateInfo})` : '';

  links.push({
    target: '_blank',
    id: 'version',
    text: `${buildInfo.edition}${stateInfo}`,
    url: licenseInfo.licenseUrl,
  });

  if (buildInfo.hideVersion) {
    return links;
  }

  const { hasReleaseNotes } = getVersionMeta(buildInfo.version);

  links.push({
    target: '_blank',
    id: 'version',
    text: `v${buildInfo.version} (${buildInfo.commit})`,
    url: hasReleaseNotes ? `https://github.com/grafana/grafana/blob/main/CHANGELOG.md` : undefined,
  });

  if (buildInfo.hasUpdate) {
    links.push({
      target: '_blank',
      id: 'updateVersion',
      text: `New version available!`,
      icon: 'download-alt',
      url: 'https://grafana.com/grafana/download?utm_source=grafana_footer',
    });
  }

  return links;
};

export function setFooterLinksFn(fn: typeof getFooterLinks) {
  getFooterLinks = fn;
}

export function setVersionLinkFn(fn: typeof getFooterLinks) {
  getVersionLinks = fn;
}

export interface Props {
  /** Link overrides to show specific links in the UI */
  customLinks?: FooterLink[] | null;
}

export const Footer = React.memo(({ customLinks }: Props) => {
  const links = customLinks || getFooterLinks();

  return (
    <footer className="footer">
      <div className="text-center">
        <ul>
          {links.map((link) => (
            <li key={link.text}>
              <FooterItem item={link} />
            </li>
          ))}
        </ul>
      </div>
    </footer>
  );
});

Footer.displayName = 'Footer';

function FooterItem({ item }: { item: FooterLink }) {
  const content = item.url ? (
    <a href={item.url} target={item.target} rel="noopener noreferrer" id={item.id}>
      {item.text}
    </a>
  ) : (
    item.text
  );

  return (
    <>
      {item.icon && <Icon name={item.icon} />} {content}
    </>
  );
}

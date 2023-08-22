import { css } from '@emotion/css';
import React, { FC } from 'react';

import { Button, Field, Form, HorizontalGroup, LinkButton } from '@grafana/ui';
import config from 'app/core/config';
import { UserDTO } from 'app/types';

import { PasswordField } from '../../core/components/PasswordField/PasswordField';

import { ChangePasswordFields } from './types';

export interface Props {
  user: UserDTO;
  isSaving: boolean;
  onChangePassword: (payload: ChangePasswordFields) => void;
}

export const ChangePasswordForm: FC<Props> = ({ user, onChangePassword, isSaving }) => {
  const { disableLoginForm } = config;
  const authSource = user.authLabels?.length && user.authLabels[0];

  if (authSource === 'LDAP' || authSource === 'Auth Proxy') {
    return <p>You cannot change password when signed in with LDAP or auth proxy.</p>;
  }
  if (authSource && disableLoginForm) {
    return <p>Password cannot be changed here.</p>;
  }

  return (
    <div
      className={css`
        max-width: 400px;
      `}
    >
      <Form onSubmit={onChangePassword}>
        {({ register, errors, getValues }) => {
          return (
            <>
              <Field label="Текуща парола" invalid={!!errors.oldPassword} error={errors?.oldPassword?.message}>
                <PasswordField
                  id="current-password"
                  autoComplete="current-password"
                  {...register('oldPassword', { required: 'Необходима е текуща парола' })}
                />
              </Field>

              <Field label="Нова парола" invalid={!!errors.newPassword} error={errors?.newPassword?.message}>
                <PasswordField
                  id="new-password"
                  autoComplete="new-password"
                  {...register('newPassword', {
                    required: 'Необходима е нова парола',
                    validate: {
                      confirm: (v) => v === getValues().confirmNew || 'Паролите трябва да съвпадат',
                      old: (v) => v !== getValues().oldPassword || `Новата парола не може да е същата като старата`,
                    },
                  })}
                />
              </Field>

              <Field
                label="Въведете отново новата парола"
                invalid={!!errors.confirmNew}
                error={errors?.confirmNew?.message}
              >
                <PasswordField
                  id="confirm-new-password"
                  autoComplete="new-password"
                  {...register('confirmNew', {
                    required: 'Необходимо е повторно въвеждане на новата парола',
                    validate: (v) => v === getValues().newPassword || 'Паролите трябва да съвпадат',
                  })}
                />
              </Field>
              <HorizontalGroup>
                <Button variant="primary" disabled={isSaving} type="submit">
                  Смени парола
                </Button>
                <LinkButton variant="secondary" href={`${config.appSubUrl}/profile`} fill="outline">
                  Откажи
                </LinkButton>
              </HorizontalGroup>
            </>
          );
        }}
      </Form>
    </div>
  );
};

// Copyright 2026 The ThunderID Authors
// SPDX-License-Identifier: Apache-2.0

import {
  FetchAuthFlows,
  FetchUsers,
  FetchUserTypes,
  OrganizationUnitListResponse,
  getFlowStepComponents,
} from '@thunderid/browser';
import {FC, ReactElement, useContext} from 'react';
import {renderInviteUserComponents} from './AuthOptionFactory';
import useStyles from './InviteFlowCard.styles';
import ComponentRendererContext, {
  ComponentRendererMap,
} from '../../../contexts/ComponentRenderer/ComponentRendererContext';
import useTheme from '../../../contexts/Theme/useTheme';
import {InviteFlow} from '../../../hooks/auth/useInviteFlow';
import {cx} from '../../../styles/emotion';
import withFlowTestIds, {collectFlowIds} from '../../../utils/withFlowTestIds';
import AlertPrimitive from '../../primitives/Alert/Alert';
// eslint-disable-next-line import/no-named-as-default
import CardPrimitive, {CardProps} from '../../primitives/Card/Card';
import Spinner from '../../primitives/Spinner/Spinner';
import Typography from '../../primitives/Typography/Typography';

/**
 * Props for {@link InviteFlowCard}.
 */
export interface InviteFlowCardProps {
  className?: string;
  /** Data source for AUTH_FLOW_SELECT fields. */
  fetchAuthFlows?: FetchAuthFlows;
  /** Function to fetch child organization units for OU_SELECT fields. */
  fetchOrganizationUnitChildren?: (
    parentId: string,
    limit: number,
    offset: number,
  ) => Promise<OrganizationUnitListResponse>;
  /** Data source for USER_SELECT fields. */
  fetchUsers?: FetchUsers;
  /** Data source for USER_TYPE_SELECT fields. */
  fetchUserTypes?: FetchUserTypes;
  /** The flow to draw, from `useInviteFlow`. */
  flow: InviteFlow;
  /** Whether the SDK is initialized. */
  isInitialized: boolean;
  /** Receives the errors of failed picker loads, which the form itself does not show. */
  onPickerError?: (error: Error) => void;
  showSubtitle: boolean;
  showTitle: boolean;
  size: 'small' | 'medium' | 'large';
  variant: CardProps['variant'];
}

/**
 * The built-in UI of the invite components: a card with the step's headings, its error, and its components drawn
 * from the server response, each input and action tagged with its flow identifier.
 */
const InviteFlowCard: FC<InviteFlowCardProps> = ({
  className = '',
  fetchAuthFlows,
  fetchOrganizationUnitChildren,
  fetchUsers,
  fetchUserTypes,
  flow,
  isInitialized,
  onPickerError,
  showSubtitle,
  showTitle,
  size,
  variant,
}: InviteFlowCardProps): ReactElement => {
  const {theme} = useTheme();
  const customRenderers: ComponentRendererMap = useContext(ComponentRendererContext);
  const styles: any = useStyles(theme, theme.vars.colors.text.primary);
  const {apiError, componentsWithoutHeadings, currentFlow, isFlowInitialized, isLoading, subtitle, t, title} = flow;

  const spinner = (
    <CardPrimitive className={cx(className, styles.card)} variant={variant}>
      <CardPrimitive.Content>
        <div className={(styles as Record<string, string>)['centeredSpinnerContainer']}>
          <Spinner size="medium" />
        </div>
      </CardPrimitive.Content>
    </CardPrimitive>
  );

  // Waiting for SDK initialization, or for the flow to start
  if (!isInitialized || (!isFlowInitialized && isLoading)) {
    return spinner;
  }

  // Error state during initialization
  if (!currentFlow && apiError) {
    return (
      <CardPrimitive className={cx(className, styles.card)} variant={variant}>
        <CardPrimitive.Content>
          <AlertPrimitive variant="error">
            <AlertPrimitive.Title>{t('errors.heading')}</AlertPrimitive.Title>
            <AlertPrimitive.Description>{apiError.message}</AlertPrimitive.Description>
          </AlertPrimitive>
        </CardPrimitive.Content>
      </CardPrimitive>
    );
  }

  const rendered: ReactElement[] =
    componentsWithoutHeadings.length > 0
      ? renderInviteUserComponents(
          componentsWithoutHeadings,
          flow.formValues,
          flow.touchedFields,
          flow.formErrors,
          isLoading,
          flow.isFormValid,
          flow.resetForm,
          flow.handleInputChange,
          {
            _customRenderers: customRenderers,
            _theme: theme,
            additionalData: currentFlow?.data?.additionalData,
            fetchAuthFlows,
            fetchOrganizationUnitChildren,
            fetchUsers,
            fetchUserTypes,
            isFormComplete: flow.validateForm(componentsWithoutHeadings).isValid,
            isTimeoutDisabled: flow.isStepExpired,
            meta: flow.meta,
            onInputBlur: flow.handleInputBlur,
            onPickerError,
            onStepExpire: flow.expireStep,
            onSubmit: flow.handleSubmit,
            size,
            t,
            variant,
          },
        )
      : [];

  // Flow components
  return (
    <CardPrimitive className={cx(className, styles.card)} variant={variant}>
      {(showTitle || showSubtitle) && (title || subtitle) && (
        <CardPrimitive.Header className={styles.header}>
          {showTitle && title && (
            <CardPrimitive.Title level={2} className={styles.title}>
              {title}
            </CardPrimitive.Title>
          )}
          {showSubtitle && subtitle && (
            <Typography variant="body1" className={styles.subtitle}>
              {subtitle}
            </Typography>
          )}
        </CardPrimitive.Header>
      )}
      <CardPrimitive.Content>
        {apiError && (
          <div className={(styles as Record<string, string>)['errorContainer']}>
            <AlertPrimitive variant="error">
              <AlertPrimitive.Description>{apiError.message}</AlertPrimitive.Description>
            </AlertPrimitive>
          </div>
        )}
        <div>
          {componentsWithoutHeadings.length > 0
            ? withFlowTestIds(rendered, collectFlowIds(getFlowStepComponents(componentsWithoutHeadings)))
            : !isLoading && (
                <AlertPrimitive variant="warning">
                  <Typography variant="body1">{t('errors.invite.components.not.available')}</Typography>
                </AlertPrimitive>
              )}
          {isLoading && (
            <div className={(styles as Record<string, string>)['centeredSpinnerContainerSmall']}>
              <Spinner size="small" />
            </div>
          )}
        </div>
      </CardPrimitive.Content>
    </CardPrimitive>
  );
};

export default InviteFlowCard;

// Copyright 2026 The ThunderID Authors
// SPDX-License-Identifier: Apache-2.0

import {Preferences} from '@thunderid/browser';
import {FC, ReactElement, ReactNode, useEffect, useMemo, useRef} from 'react';
import useInviteFlow, {InviteFlowRenderProps, InviteUserFlowResponse} from '../../../hooks/auth/useInviteFlow';
import {CardProps} from '../../primitives/Card/Card';
import InviteFlowCard from '../flow/InviteFlowCard';

/**
 * Render props for custom UI rendering of InviteToOrganizationUnit.
 */
export type BaseInviteToOrganizationUnitRenderProps = InviteFlowRenderProps;

/**
 * Props for the BaseInviteToOrganizationUnit component.
 */
export interface BaseInviteToOrganizationUnitProps {
  /**
   * Render props function for custom UI. If not provided, the default UI is rendered.
   */
  children?: (props: BaseInviteToOrganizationUnitRenderProps) => ReactNode;

  /**
   * Custom CSS class name.
   */
  className?: string;

  /**
   * The ID of the invitation flow to run. An invitation flow starts only by its ID, and only for an organization
   * unit that owns it or was shared it.
   */
  flowId: string;

  /**
   * Whether the SDK is initialized.
   */
  isInitialized?: boolean;

  /**
   * Callback when an error occurs.
   */
  onError?: (error: Error) => void;

  /**
   * Callback when the flow state changes.
   */
  onFlowChange?: (response: InviteUserFlowResponse) => void;

  /**
   * Function that starts the invitation. It must make the request with an access token issued for the organization
   * unit the invitation is into: the flow runs for the unit the token names.
   */
  onInitialize: (payload: Record<string, any>) => Promise<InviteUserFlowResponse>;

  /**
   * Function that submits a step, with the same access token.
   */
  onSubmit: (payload: Record<string, any>) => Promise<InviteUserFlowResponse>;

  /**
   * Component-level preferences to override global i18n and theme settings.
   */
  preferences?: Preferences;

  /**
   * Whether to show the subtitle.
   */
  showSubtitle?: boolean;

  /**
   * Whether to show the title.
   */
  showTitle?: boolean;

  /**
   * Size variant for the component.
   */
  size?: 'small' | 'medium' | 'large';

  /**
   * Theme variant for the component.
   */
  variant?: CardProps['variant'];
}

/**
 * Base component for inviting a user into an organization unit, through an `INVITATION` flow.
 *
 * The steps come from the flow. With the flow designer's invitation template, the administrator enters the email,
 * confirms an invitation for an email that has no account yet, and picks the roles to assign in the unit; the
 * invitee then gets the invitation by email and accepts it with `AcceptInvite`.
 *
 * When no children are provided, renders a default UI with a loading spinner, error alerts, and the step's
 * components, a role selection among them.
 */
const BaseInviteToOrganizationUnit: FC<BaseInviteToOrganizationUnitProps> = ({
  children,
  className = '',
  flowId,
  isInitialized = true,
  onError,
  onFlowChange,
  onInitialize,
  onSubmit,
  preferences,
  showSubtitle = true,
  showTitle = true,
  size = 'medium',
  variant = 'outlined',
}: BaseInviteToOrganizationUnitProps): ReactElement => {
  const start: Record<string, unknown> = useMemo(() => ({flowId}), [flowId]);
  const flow = useInviteFlow({
    errorKey: 'errors.invite.flow.failure',
    isInitialized,
    onError,
    onFlowChange,
    onInitialize,
    onSubmit,
    preferences,
    start,
  });

  // A different flow starts over.
  const startedFlowId = useRef(flowId);
  useEffect(() => {
    if (startedFlowId.current !== flowId) {
      startedFlowId.current = flowId;
      flow.resetFlow();
    }
  }, [flowId]);

  if (children) {
    return <div className={className}>{children(flow.renderProps)}</div>;
  }

  return (
    <InviteFlowCard
      className={className}
      flow={flow}
      isInitialized={isInitialized}
      onPickerError={onError}
      showSubtitle={showSubtitle}
      showTitle={showTitle}
      size={size}
      variant={variant}
    />
  );
};

export default BaseInviteToOrganizationUnit;

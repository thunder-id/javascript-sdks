// Copyright 2025-2026 The ThunderID Authors
// SPDX-License-Identifier: Apache-2.0

import {
  EmbeddedFlowType,
  FetchAuthFlows,
  FetchUsers,
  FetchUserTypes,
  OrganizationUnitListResponse,
  Preferences,
} from '@thunderid/browser';
import {FC, ReactElement, ReactNode} from 'react';
import useInviteFlow, {InviteFlowRenderProps, InviteUserFlowResponse} from '../../../hooks/auth/useInviteFlow';
import {CardProps} from '../../primitives/Card/Card';
import InviteFlowCard from '../flow/InviteFlowCard';

export type {InviteUserFlowResponse};

/**
 * Render props for custom UI rendering of InviteUser.
 */
export type BaseInviteUserRenderProps = InviteFlowRenderProps;

/**
 * Props for the BaseInviteUser component.
 */
export interface BaseInviteUserProps {
  /**
   * Render props function for custom UI.
   * If not provided, default UI will be rendered.
   */
  children?: (props: BaseInviteUserRenderProps) => ReactNode;

  /**
   * Custom CSS class name.
   */
  className?: string;

  /**
   * Function to fetch child organization units.
   * When provided, enables the OU tree picker for OU_SELECT components.
   */
  fetchOrganizationUnitChildren?: (
    parentId: string,
    limit: number,
    offset: number,
  ) => Promise<OrganizationUnitListResponse>;

  /**
   * Function to load one page of authentication flows.
   * When provided, enables the flow picker for AUTH_FLOW_SELECT components.
   */
  fetchAuthFlows?: FetchAuthFlows;
  /**
   * Function to load one page of users.
   * When provided, enables the user picker for USER_SELECT components.
   */
  fetchUsers?: FetchUsers;
  /**
   * Function to load one page of user types.
   * When provided, enables the user type picker for USER_TYPE_SELECT components.
   */
  fetchUserTypes?: FetchUserTypes;

  /**
   * Whether the SDK is initialized.
   */
  isInitialized?: boolean;

  /**
   * Callback when an error occurs. It also receives the errors of failed user, flow and user type picker loads,
   * which the form itself does not show.
   */
  onError?: (error: Error) => void;

  /**
   * Callback when the flow state changes.
   */
  onFlowChange?: (response: InviteUserFlowResponse) => void;

  /**
   * Function to initialize the invite user flow.
   * This should make an authenticated request to the flow/execute endpoint.
   */
  onInitialize: (payload: Record<string, any>) => Promise<InviteUserFlowResponse>;

  /**
   * Function to submit flow step data.
   * This should make an authenticated request to the flow/execute endpoint.
   */
  onSubmit: (payload: Record<string, any>) => Promise<InviteUserFlowResponse>;

  /**
   * Component-level preferences to override global i18n and theme settings.
   * Preferences are deep-merged with global ones, with component preferences
   * taking precedence. Affects this component and all its descendants.
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

// The user onboarding flow is the server's one flow of its type, so it starts by type.
const START: Record<string, unknown> = {flowType: EmbeddedFlowType.UserOnboarding};

/**
 * Base component for invite user flow.
 * Handles the flow logic for creating a user and generating an invite link.
 *
 * When no children are provided, renders a default UI with:
 * - Loading spinner during initialization
 * - Error alerts for failures
 * - Flow components (user type selection, user details form)
 * - Invite link display with copy functionality
 *
 * Flow steps handled:
 * 1. User type selection (if multiple types available)
 * 2. User details input (username, email)
 * 3. Invite link generation
 */
const BaseInviteUser: FC<BaseInviteUserProps> = ({
  onInitialize,
  onSubmit,
  onError,
  onFlowChange,
  className = '',
  children,
  fetchAuthFlows,
  fetchOrganizationUnitChildren,
  fetchUsers,
  fetchUserTypes,
  isInitialized = true,
  preferences,
  size = 'medium',
  variant = 'outlined',
  showTitle = true,
  showSubtitle = true,
}: BaseInviteUserProps): ReactElement => {
  const flow = useInviteFlow({
    errorKey: 'components.inviteUser.errors.generic',
    isInitialized,
    onError,
    onFlowChange,
    onInitialize,
    onSubmit,
    preferences,
    start: START,
  });

  // If children render prop is provided, use it for custom UI
  if (children) {
    return <div className={className}>{children(flow.renderProps)}</div>;
  }

  return (
    <InviteFlowCard
      className={className}
      fetchAuthFlows={fetchAuthFlows}
      fetchOrganizationUnitChildren={fetchOrganizationUnitChildren}
      fetchUsers={fetchUsers}
      fetchUserTypes={fetchUserTypes}
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

export default BaseInviteUser;

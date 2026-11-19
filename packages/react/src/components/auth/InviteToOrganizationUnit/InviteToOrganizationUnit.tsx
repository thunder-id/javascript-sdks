// Copyright 2026 The ThunderID Authors
// SPDX-License-Identifier: Apache-2.0

import {FC, ReactElement, ReactNode} from 'react';
import BaseInviteToOrganizationUnit, {BaseInviteToOrganizationUnitRenderProps} from './BaseInviteToOrganizationUnit';
import useThunderID from '../../../contexts/ThunderID/useThunderID';
import useFlowExecute from '../../../hooks/auth/useFlowExecute';
import {InviteUserFlowResponse} from '../../../hooks/auth/useInviteFlow';
import {CardProps} from '../../primitives/Card/Card';

/**
 * Render props for InviteToOrganizationUnit (re-exported for convenience).
 */
export type InviteToOrganizationUnitRenderProps = BaseInviteToOrganizationUnitRenderProps;

/**
 * Props for the InviteToOrganizationUnit component.
 */
export interface InviteToOrganizationUnitProps {
  /**
   * Render props function for custom UI. If not provided, the default UI is rendered by the SDK.
   */
  children?: (props: InviteToOrganizationUnitRenderProps) => ReactNode;

  /**
   * Custom CSS class name.
   */
  className?: string;

  /**
   * The ID of the invitation flow to run.
   */
  flowId: string;

  /**
   * Callback when an error occurs.
   */
  onError?: (error: Error) => void;

  /**
   * Callback when the flow state changes.
   */
  onFlowChange?: (response: InviteUserFlowResponse) => void;

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
   * Theme variant for the component card.
   */
  variant?: CardProps['variant'];
}

/**
 * Invites a user into an organization unit through an `INVITATION` flow, as the signed-in administrator.
 *
 * The flow runs for the organization unit the administrator's access token names, so the application signs the
 * administrator in to that unit first (its token carries `ouId`). The flow must be owned by that unit or shared with
 * it, and the administrator needs the permission the flow requires, `system` in the flow designer's template. The
 * invitee accepts with `AcceptInvite`.
 *
 * @example
 * ```tsx
 * import {InviteToOrganizationUnit} from '@thunderid/react';
 *
 * const InviteMemberPage = () => (
 *   <InviteToOrganizationUnit
 *     flowId={INVITATION_FLOW_ID}
 *     onFlowChange={(response) => console.log(response.flowStatus)}
 *     onError={(error) => console.error(error)}
 *   />
 * );
 * ```
 */
const InviteToOrganizationUnit: FC<InviteToOrganizationUnitProps> = ({
  children,
  className,
  flowId,
  onError,
  onFlowChange,
  showSubtitle = true,
  showTitle = true,
  size = 'medium',
  variant = 'outlined',
}: InviteToOrganizationUnitProps): ReactElement => {
  const {isInitialized} = useThunderID();
  // Posts to the resource server's flow execution endpoint with the administrator's access token.
  const execute: (payload: Record<string, unknown>) => Promise<InviteUserFlowResponse> =
    useFlowExecute<InviteUserFlowResponse>();

  return (
    <BaseInviteToOrganizationUnit
      className={className}
      flowId={flowId}
      isInitialized={isInitialized}
      onError={onError}
      onFlowChange={onFlowChange}
      onInitialize={execute}
      onSubmit={execute}
      showSubtitle={showSubtitle}
      showTitle={showTitle}
      size={size}
      variant={variant}
    >
      {children}
    </BaseInviteToOrganizationUnit>
  );
};

export default InviteToOrganizationUnit;

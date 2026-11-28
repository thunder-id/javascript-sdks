// Copyright 2025-2026 The ThunderID Authors
// SPDX-License-Identifier: Apache-2.0

import {
  EmbeddedFlowType,
  FetchAuthFlows,
  FetchUsers,
  FetchUserTypes,
  getOrganizationUnitChildren,
  OrganizationUnitListResponse,
} from '@thunderid/browser';
import {FC, ReactElement, ReactNode, useCallback} from 'react';
// eslint-disable-next-line import/no-named-as-default
import BaseInviteUser, {BaseInviteUserRenderProps, InviteUserFlowResponse} from './BaseInviteUser';
import useThunderID from '../../../contexts/ThunderID/useThunderID';
import useFetchAuthFlows from '../../../hooks/auth/useFetchAuthFlows';
import useFlowExecute from '../../../hooks/auth/useFlowExecute';
import useFetchUsers from '../../../hooks/management/useFetchUsers';
import useFetchUserTypes from '../../../hooks/management/useFetchUserTypes';

/**
 * Render props for InviteUser (re-exported for convenience).
 */
export type InviteUserRenderProps = BaseInviteUserRenderProps;

/**
 * Props for the InviteUser component.
 */
export interface InviteUserProps {
  /**
   * Render props function for custom UI.
   * If not provided, default UI will be rendered by the SDK.
   */
  children?: (props: InviteUserRenderProps) => ReactNode;

  /**
   * Custom CSS class name.
   */
  className?: string;

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
  variant?: 'outlined' | 'elevated';
}

/**
 * InviteUser component for initiating invite user flow.
 *
 * This component is designed for admin users in the thunder-develop app to:
 * 1. Select a user type (if multiple available)
 * 2. Enter user details (username, email)
 * 3. Generate an invite link for the end user
 *
 * The component uses the authenticated ThunderID SDK context to make API calls
 * with the admin's access token (requires 'system' scope).
 *
 * @example
 * ```tsx
 * import { InviteUser } from '@thunderid/react';
 *
 * const InviteUserPage = () => {
 *   const [inviteLink, setInviteLink] = useState<string>();
 *
 *   return (
 *     <InviteUser
 *       onInviteLinkGenerated={(link, executionId) => setInviteLink(link)}
 *       onError={(error) => console.error(error)}
 *     >
 *       {({ values, components, isLoading, handleInputChange, handleSubmit, inviteLink, isInviteGenerated }) => (
 *         <div>
 *           {isInviteGenerated ? (
 *             <div>
 *               <h2>Invite Link Generated!</h2>
 *               <p>{inviteLink}</p>
 *             </div>
 *           ) : (
 *             // Render form based on components
 *           )}
 *         </div>
 *       )}
 *     </InviteUser>
 *   );
 * };
 * ```
 */
const InviteUser: FC<InviteUserProps> = ({
  onError,
  onFlowChange,
  className,
  children,
  size = 'medium',
  variant = 'outlined',
  showTitle = true,
  showSubtitle = true,
}: InviteUserProps): ReactElement => {
  const {baseUrl, getAccessToken, isInitialized} = useThunderID();
  // Posts to the resource server's flow execution endpoint with the admin's access token.
  const execute: (payload: Record<string, unknown>) => Promise<InviteUserFlowResponse> =
    useFlowExecute<InviteUserFlowResponse>();

  /**
   * Initialize the invite user flow.
   * Makes an authenticated request to /flow/execute with flowType: USER_ONBOARDING.
   */
  const handleInitialize = (payload: Record<string, any>): Promise<InviteUserFlowResponse> =>
    execute({...payload, flowType: EmbeddedFlowType.UserOnboarding, verbose: true});

  /**
   * Submit flow step data.
   * Makes an authenticated request to /flow/execute with the step data.
   */
  const handleSubmit = (payload: Record<string, any>): Promise<InviteUserFlowResponse> =>
    execute({...payload, verbose: true});

  const fetchOrganizationUnitChildren: (
    parentId: string,
    limit: number,
    offset: number,
  ) => Promise<OrganizationUnitListResponse> = useCallback(
    async (parentId: string, limit: number, offset: number): Promise<OrganizationUnitListResponse> => {
      const accessToken: string = await getAccessToken();

      return getOrganizationUnitChildren({
        baseUrl,
        headers: {Authorization: `Bearer ${accessToken}`},
        limit,
        offset,
        organizationUnitId: parentId,
      });
    },
    [baseUrl, getAccessToken],
  );

  const fetchAuthFlows: FetchAuthFlows = useFetchAuthFlows();
  const fetchUsers: FetchUsers = useFetchUsers();
  const fetchUserTypes: FetchUserTypes = useFetchUserTypes();

  return (
    <BaseInviteUser
      onInitialize={handleInitialize}
      onSubmit={handleSubmit}
      onError={onError}
      onFlowChange={onFlowChange}
      className={className}
      fetchOrganizationUnitChildren={fetchOrganizationUnitChildren}
      fetchAuthFlows={fetchAuthFlows}
      fetchUsers={fetchUsers}
      fetchUserTypes={fetchUserTypes}
      isInitialized={isInitialized}
      size={size}
      variant={variant}
      showTitle={showTitle}
      showSubtitle={showSubtitle}
    >
      {children}
    </BaseInviteUser>
  );
};

export default InviteUser;

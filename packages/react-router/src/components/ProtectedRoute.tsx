// Copyright 2025 The ThunderID Authors
// SPDX-License-Identifier: Apache-2.0

import {createPackageComponentLogger} from '@thunderid/browser';
import {ThunderIDRuntimeError, navigate, useThunderID} from '@thunderid/react';
import {FC, ReactElement, ReactNode, RefObject, useEffect, useRef} from 'react';
import {Navigate} from 'react-router';
import PageViewTracker from './PageViewTracker';

const logger: ReturnType<typeof createPackageComponentLogger> = createPackageComponentLogger(
  '@thunderid/react-router',
  'ProtectedRoute',
);

/**
 * Props for the ProtectedRoute component.
 */
export interface ProtectedRouteProps {
  /**
   * The element to render when the user is authenticated.
   */
  children: ReactElement;
  /**
   * Custom fallback element to render when the user is not authenticated.
   * If provided, this takes precedence over redirectTo.
   */
  fallback?: ReactElement;
  /**
   * Custom loading element to render while authentication status is being determined.
   */
  loader?: ReactNode;
  /**
   * Custom sign-in function to override the default behavior.
   * If provided, this function will be called instead of the default signIn method
   * when the user is not authenticated and no fallback or redirectTo is specified.
   * This allows you to pass additional parameters or implement custom sign-in logic.
   *
   * @param defaultSignIn - The default signIn method from useThunderID hook
   * @param signInOptions - Merged sign-in options (context + component props)
   */
  onSignIn?: (
    defaultSignIn: (options?: Record<string, any>) => Promise<void>,
    signInOptions?: Record<string, any>,
  ) => void | Promise<void>;
  /**
   * URL to redirect to when the user is not authenticated.
   * When neither this nor a fallback element is provided, sign-in is initiated instead.
   */
  redirectTo?: string;
  /**
   * Additional parameters to pass to the authorize request.
   * These will be merged with the default signInOptions from the ThunderID context.
   * Common options include:
   * - prompt: "login" | "none" | "consent" | "select_account"
   * - fidp: Federation Identity Provider identifier
   * - kc_idp_hint: Keycloak identity provider hint
   * - login_hint: Hint to help with the username/identifier in the login form
   * - max_age: Maximum authentication age in seconds
   * - ui_locales: End-user's preferred languages and scripts for the user interface
   *
   * @example
   * ```tsx
   * signInOptions={{
   *   prompt: "login",
   *   fidp: "OrganizationSSO",
   *   login_hint: "user@example.com"
   * }}
   * ```
   */
  signInOptions?: Record<string, any>;
  /**
   * Additional parameters to pass to the token request body.
   * These will be merged with the default tokenRequest from the ThunderID context.
   *
   * @example
   * ```tsx
   * tokenRequest={{ params: { resource: "https://api.example.com" } }}
   * ```
   */
  tokenRequest?: {params?: Record<string, unknown>};
}

/**
 * A protected route component that requires authentication to access.
 *
 * This component should be used as the element prop of a Route component.
 * It checks authentication status and either renders the protected content,
 * shows a loading state, redirects, or shows a fallback.
 *
 * For unauthenticated users it renders the `fallback`, redirects to `redirectTo`, or, when neither
 * is provided, initiates sign-in and renders the `loader` until the redirect happens.
 *
 * @example Basic usage with redirect
 * ```tsx
 * <Route
 *   path="/dashboard"
 *   element={
 *     <ProtectedRoute redirectTo="/signin">
 *       <Dashboard />
 *     </ProtectedRoute>
 *   }
 * />
 * ```
 *
 * @example With custom fallback
 * ```tsx
 * <Route
 *   path="/admin"
 *   element={
 *     <ProtectedRoute fallback={<div>Access denied</div>}>
 *       <AdminPanel />
 *     </ProtectedRoute>
 *   }
 * />
 * ```
 *
 * @example With custom sign-in parameters
 * ```tsx
 * <Route
 *   path="/secure"
 *   element={
 *     <ProtectedRoute signInOptions={{ prompt: "login", fidp: "OrganizationSSO" }}>
 *       <SecureContent />
 *     </ProtectedRoute>
 *   }
 * />
 * ```
 *
 * @example With custom sign-in handler
 * ```tsx
 * <Route
 *   path="/custom"
 *   element={
 *     <ProtectedRoute
 *       onSignIn={(defaultSignIn, options) => {
 *         // Custom logic before sign-in
 *         console.log('Initiating custom sign-in');
 *         defaultSignIn({ ...options, prompt: "login" });
 *       }}
 *       signInOptions={{ fidp: "CustomIDP" }}
 *     >
 *       <CustomContent />
 *     </ProtectedRoute>
 *   }
 * />
 * ```
 */
const ProtectedRoute: FC<ProtectedRouteProps> = ({
  children,
  fallback,
  redirectTo,
  loader = null,
  onSignIn,
  signInOptions: overriddenSignInOptions,
  tokenRequest: overriddenTokenRequest,
}: ProtectedRouteProps) => {
  const {isSignedIn, isLoading, signIn, signInOptions, tokenRequest, signInUrl} = useThunderID();

  const hasInitiatedSignInRef: RefObject<boolean> = useRef<boolean>(false);

  const needsSignIn: boolean = !isSignedIn && !fallback && !redirectTo;
  const shouldInitiateSignIn: boolean = !isLoading && needsSignIn;

  // Sign-in must be initiated from an effect, never from render: it updates the provider's state,
  // and a render-phase update makes React discard the render and retry it, re-running the sign-in
  // on every retry.
  useEffect(() => {
    if (!needsSignIn) {
      // Reset so a later sign-out initiates sign-in again instead of rendering the loader forever.
      // Keyed off `needsSignIn`, not `shouldInitiateSignIn`: the in-flight sign-in toggles the
      // provider's loading state, and resetting on that would re-arm the guard and sign in twice.
      hasInitiatedSignInRef.current = false;
      return;
    }

    if (!shouldInitiateSignIn || hasInitiatedSignInRef.current) {
      return;
    }

    hasInitiatedSignInRef.current = true;

    // Logged rather than thrown: a rejection here cannot reach React, and CallbackRoute treats
    // async auth failures the same way.
    const reportSignInFailure = (error: unknown): void => {
      const signInError: ThunderIDRuntimeError = new ThunderIDRuntimeError(
        'Sign-in failed in ProtectedRoute.',
        'ProtectedRoute-SignInError-001',
        'react-router',
        error,
      );

      logger.error(signInError.message, signInError);
    };

    if (signInUrl) {
      navigate(signInUrl);
      return;
    }
    if (onSignIn) {
      // onSignIn may be async; wrapping the call in Promise.resolve().then() catches both a
      // synchronous throw and a rejected Promise through the same error path as default sign-in.
      Promise.resolve()
        .then(() => onSignIn(signIn, overriddenSignInOptions))
        .catch(reportSignInFailure);
      return;
    }

    const mergedParams: Record<string, unknown> | undefined = (overriddenTokenRequest ?? tokenRequest)?.params;

    signIn(
      overriddenSignInOptions ?? signInOptions,
      undefined,
      undefined,
      undefined,
      mergedParams && Object.keys(mergedParams).length > 0 ? {params: mergedParams} : undefined,
    ).catch(reportSignInFailure);
  }, [
    needsSignIn,
    shouldInitiateSignIn,
    signInUrl,
    onSignIn,
    signIn,
    signInOptions,
    overriddenSignInOptions,
    tokenRequest,
    overriddenTokenRequest,
  ]);

  // Always wait for loading to finish before making authentication decisions
  if (isLoading) {
    return loader;
  }

  if (isSignedIn) {
    return (
      <>
        {children}
        {/* After the children, so a tracker in a protected page below reports first. */}
        <PageViewTracker />
      </>
    );
  }

  if (fallback) {
    return fallback;
  }

  if (redirectTo) {
    return <Navigate to={redirectTo} replace />;
  }

  // The effect above is taking the user to sign-in; render the loader until that resolves.
  return loader;
};

export default ProtectedRoute;

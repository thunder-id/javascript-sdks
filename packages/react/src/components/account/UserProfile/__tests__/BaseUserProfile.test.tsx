// Copyright 2026 The ThunderID Authors
// SPDX-License-Identifier: Apache-2.0

import {cleanup, fireEvent, render, screen, waitFor, within} from '@testing-library/react';
import {AttributeSchema, User} from '@thunderid/browser';
import {ReactElement, ReactNode, useState} from 'react';
import {afterEach, describe, expect, it, Mock, vi} from 'vitest';
import I18nProvider from '../../../../contexts/I18n/I18nProvider';
import ThemeProvider from '../../../../contexts/Theme/ThemeProvider';
import BaseUserProfile, {BaseUserProfileProps, BaseUserProfileVerificationRenderProps} from '../BaseUserProfile';

const VERIFIED_AT = '2026-10-16T08:30:00Z';

const userSchema: Record<string, AttributeSchema> = {
  email: {displayName: 'Email', type: 'email'},
  given_name: {displayName: 'First name', type: 'string'},
  mobile: {displayName: 'Mobile', type: 'mobile'},
};

// A /users/me profile: attributes are nested and spread to the top level.
const profileOf = (attributes: Record<string, unknown>, verifiedAttributes?: Record<string, unknown>): User => ({
  attributes,
  id: 'user-1',
  type: 'person',
  ...attributes,
  ...(verifiedAttributes ? {verifiedAttributes} : {}),
});

const storedProfile: User = profileOf(
  {email: 'alex@example.com', given_name: 'Alex', mobile: '+94771234567'},
  {email: {verifiedAt: VERIFIED_AT}},
);

const unverifiedProfile: User = profileOf({email: 'alex@example.com', given_name: 'Alex', mobile: '+94771234567'}, {});

// The server drops the verification of a changed attribute.
const serverUpdate = (profile: User, payload: Record<string, unknown>): User => {
  const attributes: Record<string, unknown> = {...(profile['attributes'] as Record<string, unknown>), ...payload};
  const verifiedAttributes: Record<string, unknown> = {...(profile['verifiedAttributes'] as Record<string, unknown>)};
  Object.keys(payload).forEach((key: string) => {
    if (payload[key] !== (profile['attributes'] as Record<string, unknown>)[key]) delete verifiedAttributes[key];
  });
  return profileOf(attributes, verifiedAttributes);
};

const verificationPanel = (props: BaseUserProfileVerificationRenderProps): ReactNode => (
  <div data-testid="verification-panel">
    <span>{`Verifying ${props.attributeDisplayName} (${props.attribute})`}</span>
    <button type="button" onClick={props.onCancel}>
      Not now
    </button>
  </div>
);

const withProviders = (ui: ReactElement): ReactElement => (
  <I18nProvider>
    <ThemeProvider>{ui}</ThemeProvider>
  </I18nProvider>
);

const renderProfile = (props: Partial<BaseUserProfileProps> = {}): ReturnType<typeof render> =>
  render(
    withProviders(
      <BaseUserProfile profile={storedProfile} flattenedProfile={storedProfile} userSchema={userSchema} {...props} />,
    ),
  );

interface HarnessProps {
  initialProfile: User;
  // A profile the next reload returns, as a revalidation from elsewhere would.
  reloadedProfile?: User;
  renderVerification?: BaseUserProfileProps['renderVerification'];
  update: (profile: User, payload: Record<string, unknown>) => Promise<User>;
}

// Holds the profile and the save error as UserProfile does: a failed save sets `error` and keeps the profile.
const Harness = ({
  initialProfile,
  reloadedProfile = undefined,
  renderVerification = undefined,
  update,
}: HarnessProps): ReactElement => {
  const [profile, setProfile] = useState<User>(initialProfile);
  const [error, setError] = useState<string | null>(null);

  const onUpdate = async (payload: Record<string, unknown>): Promise<void> => {
    setError(null);
    try {
      setProfile(await update(profile, payload));
    } catch {
      setError('Could not update your profile.');
    }
  };

  return (
    <>
      <BaseUserProfile
        editable
        error={error}
        flattenedProfile={profile}
        profile={profile}
        renderVerification={renderVerification}
        userSchema={userSchema}
        onUpdate={onUpdate}
      />
      {reloadedProfile && (
        <button type="button" onClick={(): void => setProfile(reloadedProfile)}>
          Reload profile
        </button>
      )}
    </>
  );
};

const renderHarness = (props: HarnessProps): ReturnType<typeof render> => render(withProviders(<Harness {...props} />));

// The row of a field: its label, value, status, actions and verification panel.
const row = (label: string): HTMLElement => {
  const labelElement: HTMLElement = screen.getAllByText(label).find((el: HTMLElement) => el.tagName === 'SPAN')!;
  return labelElement.parentElement!.parentElement!.parentElement!;
};

const editAndSave = (label: string, value: string): void => {
  fireEvent.click(within(row(label)).getByTitle('Edit'));
  fireEvent.change(within(row(label)).getByRole('textbox'), {target: {value}});
  fireEvent.click(within(row(label)).getByText('Save'));
};

describe('BaseUserProfile verification', () => {
  afterEach(() => {
    cleanup();
  });

  describe('status', () => {
    it('shows Verified or Unverified for each email and mobile field with a value', () => {
      renderProfile();

      expect(within(row('Email')).getByText('Verified')).toBeTruthy();
      expect(within(row('Mobile')).getByText('Unverified')).toBeTruthy();
      expect(within(row('First name')).queryByText(/Verified|Unverified/)).toBeNull();
    });

    it('gives the verification time of a verified field, also as text for keyboard and touch users', () => {
      renderProfile();

      const verifiedOn = `Verified on ${new Date(VERIFIED_AT).toLocaleString('en-US')}`;
      const status: HTMLElement = within(row('Email')).getByText('Verified');
      expect(status.getAttribute('title')).toBe(verifiedOn);
      expect(status.textContent).toBe(`Verified (${verifiedOn})`);
      expect(within(row('Mobile')).getByText('Unverified').getAttribute('title')).toBeNull();
      expect(within(row('Mobile')).getByText('Unverified').textContent).toBe('Unverified');
    });

    it('shows no status when the profile does not report verification', () => {
      const legacyProfile: User = profileOf({email: 'alex@example.com', mobile: '+94771234567'});

      renderProfile({flattenedProfile: legacyProfile, profile: legacyProfile});

      expect(screen.queryByText(/Verified|Unverified/)).toBeNull();
    });

    it('does not list the verification record as a profile field', () => {
      renderProfile({userSchema: undefined});

      expect(screen.getByText('alex@example.com', {selector: 'div'})).toBeTruthy();
      expect(screen.queryByText('Verified Attributes')).toBeNull();
      expect(screen.queryByText(/verifiedAt/)).toBeNull();
    });

    it('shows no status for an empty field', () => {
      const noMobile: User = profileOf({email: 'alex@example.com', mobile: ''}, {});

      renderProfile({editable: true, flattenedProfile: noMobile, onUpdate: vi.fn(), profile: noMobile});

      expect(within(row('Mobile')).queryByText(/Verified|Unverified/)).toBeNull();
      expect(within(row('Email')).getByText('Unverified')).toBeTruthy();
    });

    it('hides the status while the field is being edited', () => {
      renderProfile({editable: true, onUpdate: vi.fn()});

      fireEvent.click(within(row('Email')).getByTitle('Edit'));

      expect(within(row('Email')).queryByText('Verified')).toBeNull();
    });
  });

  describe('Verify action', () => {
    it('is offered for an unverified email and mobile', () => {
      renderProfile({
        flattenedProfile: unverifiedProfile,
        profile: unverifiedProfile,
        renderVerification: verificationPanel,
      });

      expect(within(row('Email')).getByText('Verify')).toBeTruthy();
      expect(within(row('Mobile')).getByText('Verify')).toBeTruthy();
      expect(within(row('Mobile')).getByText('Unverified')).toBeTruthy();
    });

    it('carries test identifiers on the status and the Verify action', () => {
      renderProfile({
        flattenedProfile: unverifiedProfile,
        profile: unverifiedProfile,
        renderVerification: verificationPanel,
      });

      expect(within(row('Email')).getByText('Verify').closest('button')!.getAttribute('data-testid')).toBe(
        'thunderid-verify-email',
      );
      expect(within(row('Mobile')).getByText('Unverified').getAttribute('data-testid')).toBe(
        'thunderid-verification-status-mobile',
      );
    });

    it('is not offered, and no status shown, for a string attribute such as a first name', () => {
      const renderVerification: Mock = vi.fn(verificationPanel);
      renderProfile({flattenedProfile: unverifiedProfile, profile: unverifiedProfile, renderVerification});

      expect(within(row('First name')).getByText('Alex')).toBeTruthy();
      expect(within(row('First name')).queryByText('Verify')).toBeNull();
      expect(within(row('First name')).queryByText(/Verified|Unverified/)).toBeNull();
      expect(renderVerification).not.toHaveBeenCalled();
    });

    it('is not offered when the profile does not report verification', () => {
      const legacyProfile: User = profileOf({email: 'alex@example.com', given_name: 'Alex', mobile: '+94771234567'});

      renderProfile({flattenedProfile: legacyProfile, profile: legacyProfile, renderVerification: verificationPanel});

      expect(within(row('Email')).getByText('alex@example.com')).toBeTruthy();
      expect(screen.queryByText('Verify')).toBeNull();
      expect(screen.queryByText(/Verified|Unverified/)).toBeNull();
    });

    it('is not offered for a verified email', () => {
      renderProfile({renderVerification: verificationPanel});

      expect(within(row('Email')).queryByText('Verify')).toBeNull();
      expect(within(row('Mobile')).getByText('Verify')).toBeTruthy();
    });

    it('is not offered on a profile that cannot be edited', () => {
      const renderVerification: Mock = vi.fn(verificationPanel);
      renderProfile({
        editable: false,
        flattenedProfile: unverifiedProfile,
        profile: unverifiedProfile,
        renderVerification,
      });

      expect(within(row('Email')).getByText('Unverified')).toBeTruthy();
      expect(screen.queryByText('Verify')).toBeNull();
    });

    it('is not offered without a verification renderer', () => {
      renderProfile({flattenedProfile: unverifiedProfile, profile: unverifiedProfile});

      expect(within(row('Email')).getByText('Unverified')).toBeTruthy();
      expect(screen.queryByText('Verify')).toBeNull();
    });

    it('opens the verification panel for the field and closes it on dismiss', () => {
      const renderVerification: Mock = vi.fn(verificationPanel);
      renderProfile({flattenedProfile: unverifiedProfile, profile: unverifiedProfile, renderVerification});

      fireEvent.click(within(row('Email')).getByText('Verify'));

      expect(within(row('Email')).getByText('Verifying Email (email)')).toBeTruthy();
      expect(within(row('Email')).queryByText('Verify')).toBeNull();

      fireEvent.click(screen.getByText('Not now'));

      expect(screen.queryByTestId('verification-panel')).toBeNull();
      expect(within(row('Email')).getByText('Verify')).toBeTruthy();
    });

    it('opens the verification panel for a mobile field', () => {
      renderProfile({
        flattenedProfile: unverifiedProfile,
        profile: unverifiedProfile,
        renderVerification: verificationPanel,
      });

      fireEvent.click(within(row('Mobile')).getByText('Verify'));

      expect(within(row('Mobile')).getByText('Verifying Mobile (mobile)')).toBeTruthy();
    });

    it('closes the panel when the field is edited', () => {
      renderProfile({
        editable: true,
        flattenedProfile: unverifiedProfile,
        onUpdate: vi.fn(),
        profile: unverifiedProfile,
        renderVerification: verificationPanel,
      });

      fireEvent.click(within(row('Email')).getByText('Verify'));
      fireEvent.click(within(row('Email')).getByTitle('Edit'));

      expect(screen.queryByTestId('verification-panel')).toBeNull();
    });
  });

  describe('after saving', () => {
    it('opens the verification panel once the profile shows a changed email as unverified', async () => {
      let finishUpdate: (profile: User) => void = () => undefined;
      const update: Mock = vi.fn(
        () =>
          new Promise<User>((resolve: (profile: User) => void) => {
            finishUpdate = resolve;
          }),
      );
      renderHarness({initialProfile: storedProfile, renderVerification: verificationPanel, update});

      editAndSave('Email', 'new@example.com');

      expect(update).toHaveBeenCalledWith(storedProfile, {email: 'new@example.com'});
      expect(screen.queryByTestId('verification-panel')).toBeNull();

      finishUpdate(serverUpdate(storedProfile, {email: 'new@example.com'}));

      expect(await screen.findByText('Verifying Email (email)')).toBeTruthy();
      expect(within(row('Email')).getByText('Unverified')).toBeTruthy();
    });

    it('does not reopen the panel after it is dismissed', async () => {
      const update: Mock = vi.fn((profile: User, payload: Record<string, unknown>) =>
        Promise.resolve(serverUpdate(profile, payload)),
      );
      renderHarness({initialProfile: storedProfile, renderVerification: verificationPanel, update});

      editAndSave('Email', 'new@example.com');
      await screen.findByText('Verifying Email (email)');
      fireEvent.click(screen.getByText('Not now'));
      editAndSave('First name', 'Alexa');

      await waitFor(() => expect(update).toHaveBeenCalledTimes(2));
      await waitFor(() => expect(within(row('First name')).getByText('Alexa')).toBeTruthy());
      expect(screen.queryByTestId('verification-panel')).toBeNull();
    });

    it('starts no verification when the save fails, even once the email later changes', async () => {
      const update: Mock = vi.fn(() => Promise.reject(new Error('rejected')));
      renderHarness({
        initialProfile: storedProfile,
        reloadedProfile: serverUpdate(storedProfile, {email: 'other@example.com'}),
        renderVerification: verificationPanel,
        update,
      });

      editAndSave('Email', 'new@example.com');

      expect(await screen.findByText('Could not update your profile.')).toBeTruthy();
      expect(screen.queryByTestId('verification-panel')).toBeNull();

      fireEvent.click(screen.getByText('Reload profile'));

      await waitFor(() => expect(within(row('Email')).getByText('Unverified')).toBeTruthy());
      expect(screen.queryByTestId('verification-panel')).toBeNull();
    });

    it('opens no panel when the profile shows the new email already verified', async () => {
      const update: Mock = vi.fn((profile: User, payload: Record<string, unknown>) =>
        Promise.resolve(
          profileOf(
            {...(profile['attributes'] as Record<string, unknown>), ...payload},
            {
              email: {verifiedAt: VERIFIED_AT},
            },
          ),
        ),
      );
      renderHarness({initialProfile: unverifiedProfile, renderVerification: verificationPanel, update});

      editAndSave('Email', 'new@example.com');

      await waitFor(() => expect(within(row('Email')).getByText('Verified')).toBeTruthy());
      expect(screen.queryByTestId('verification-panel')).toBeNull();
    });

    it('starts no verification when the email is saved unchanged, even once it later changes', async () => {
      const update: Mock = vi.fn((profile: User, payload: Record<string, unknown>) =>
        Promise.resolve(serverUpdate(profile, payload)),
      );
      renderHarness({
        initialProfile: unverifiedProfile,
        reloadedProfile: serverUpdate(unverifiedProfile, {email: 'other@example.com'}),
        renderVerification: verificationPanel,
        update,
      });

      editAndSave('Email', 'alex@example.com');

      await waitFor(() => expect(update).toHaveBeenCalledTimes(1));
      await waitFor(() => expect(within(row('Email')).getByText('Unverified')).toBeTruthy());
      expect(screen.queryByTestId('verification-panel')).toBeNull();

      fireEvent.click(screen.getByText('Reload profile'));

      await waitFor(() => expect(within(row('Email')).getByText('other@example.com')).toBeTruthy());
      expect(screen.queryByTestId('verification-panel')).toBeNull();
    });

    it('starts no verification for a changed mobile', async () => {
      const update: Mock = vi.fn((profile: User, payload: Record<string, unknown>) =>
        Promise.resolve(serverUpdate(profile, payload)),
      );
      renderHarness({initialProfile: storedProfile, renderVerification: verificationPanel, update});

      editAndSave('Mobile', '+94770000000');

      await waitFor(() => expect(within(row('Mobile')).getByText('+94770000000')).toBeTruthy());
      expect(screen.queryByTestId('verification-panel')).toBeNull();
    });

    it('starts no verification for a changed email when the profile does not report verification', async () => {
      const legacyProfile: User = profileOf({email: 'alex@example.com', given_name: 'Alex', mobile: '+94771234567'});
      const update: Mock = vi.fn((profile: User, payload: Record<string, unknown>) =>
        Promise.resolve(profileOf({...(profile['attributes'] as Record<string, unknown>), ...payload})),
      );
      renderHarness({initialProfile: legacyProfile, renderVerification: verificationPanel, update});

      editAndSave('Email', 'new@example.com');

      await waitFor(() => expect(within(row('Email')).getByText('new@example.com')).toBeTruthy());
      expect(screen.queryByTestId('verification-panel')).toBeNull();
      expect(screen.queryByText(/Verified|Unverified/)).toBeNull();
    });

    it('starts no verification for a changed first name', async () => {
      const update: Mock = vi.fn((profile: User, payload: Record<string, unknown>) =>
        Promise.resolve(serverUpdate(profile, payload)),
      );
      renderHarness({initialProfile: unverifiedProfile, renderVerification: verificationPanel, update});

      editAndSave('First name', 'Alexa');

      await waitFor(() => expect(within(row('First name')).getByText('Alexa')).toBeTruthy());
      expect(screen.queryByTestId('verification-panel')).toBeNull();
    });

    it('starts no verification without a verification renderer', async () => {
      const update: Mock = vi.fn((profile: User, payload: Record<string, unknown>) =>
        Promise.resolve(serverUpdate(profile, payload)),
      );
      renderHarness({initialProfile: storedProfile, update});

      editAndSave('Email', 'new@example.com');

      await waitFor(() => expect(within(row('Email')).getByText('Unverified')).toBeTruthy());
      expect(screen.queryByText('Verify')).toBeNull();
    });

    it('drops a pending verification when a later save does not qualify', async () => {
      const finishers: ((profile: User) => void)[] = [];
      const update: Mock = vi.fn(
        () =>
          new Promise<User>((resolve: (profile: User) => void) => {
            finishers.push(resolve);
          }),
      );
      renderHarness({initialProfile: storedProfile, renderVerification: verificationPanel, update});

      editAndSave('Email', 'new@example.com');
      editAndSave('First name', 'Alexa');
      const changedEmail: User = serverUpdate(storedProfile, {email: 'new@example.com'});
      finishers[0](changedEmail);
      finishers[1](serverUpdate(changedEmail, {given_name: 'Alexa'}));

      await waitFor(() => expect(within(row('Email')).getByText('Unverified')).toBeTruthy());
      expect(screen.queryByTestId('verification-panel')).toBeNull();
    });
  });

  describe('while a save is in flight', () => {
    it('shows neither the status nor Verify on the saved field until the profile reflects the save', async () => {
      let finishUpdate: (profile: User) => void = () => undefined;
      const update: Mock = vi.fn(
        () =>
          new Promise<User>((resolve: (profile: User) => void) => {
            finishUpdate = resolve;
          }),
      );
      renderHarness({initialProfile: unverifiedProfile, renderVerification: verificationPanel, update});

      editAndSave('Email', 'new@example.com');

      expect(within(row('Email')).queryByText(/Verified|Unverified/)).toBeNull();
      expect(within(row('Email')).queryByText('Verify')).toBeNull();
      expect(within(row('Mobile')).getByText('Verify')).toBeTruthy();

      finishUpdate(serverUpdate(unverifiedProfile, {email: 'new@example.com'}));

      await waitFor(() => expect(within(row('Email')).getByText('Unverified')).toBeTruthy());
      expect(within(row('Email')).getByText('new@example.com')).toBeTruthy();
    });

    it('does not show the old Verified status while the changed value is saved', () => {
      const update: Mock = vi.fn(() => new Promise<User>(() => undefined));
      renderHarness({initialProfile: storedProfile, renderVerification: verificationPanel, update});

      editAndSave('Email', 'new@example.com');

      expect(within(row('Email')).queryByText(/Verified|Unverified/)).toBeNull();
    });

    it('shows the stored value with its own status once the save fails, never the typed one', async () => {
      const update: Mock = vi.fn(() => Promise.reject(new Error('rejected')));
      renderHarness({initialProfile: unverifiedProfile, renderVerification: verificationPanel, update});

      editAndSave('Email', 'new@example.com');
      await screen.findByText('Could not update your profile.');

      await waitFor(() => expect(within(row('Email')).getByText('Unverified')).toBeTruthy());
      expect(within(row('Email')).getByText('alex@example.com')).toBeTruthy();
      expect(within(row('Email')).queryByText('new@example.com')).toBeNull();
      expect(within(row('Email')).getByText('Verify')).toBeTruthy();
    });

    it('settles a rejected update from the caller and shows the stored status again', async () => {
      const onUpdate: Mock = vi.fn(() => Promise.reject(new Error('rejected')));
      renderProfile({
        editable: true,
        flattenedProfile: unverifiedProfile,
        onUpdate,
        profile: unverifiedProfile,
        renderVerification: verificationPanel,
      });

      editAndSave('Email', 'new@example.com');

      expect(onUpdate).toHaveBeenCalledWith({email: 'new@example.com'});
      await waitFor(() => expect(within(row('Email')).getByText('Unverified')).toBeTruthy());
      expect(screen.queryByTestId('verification-panel')).toBeNull();
    });

    it('shows no status or Verify for a value the row shows that is not the stored one', () => {
      // A profile whose top-level value, such as an ID token claim, differs from the stored attribute.
      const mismatched: User = {...unverifiedProfile, email: 'claim@example.com'};

      renderProfile({flattenedProfile: mismatched, profile: mismatched, renderVerification: verificationPanel});

      expect(within(row('Email')).queryByText(/Verified|Unverified/)).toBeNull();
      expect(within(row('Email')).queryByText('Verify')).toBeNull();
    });
  });
});

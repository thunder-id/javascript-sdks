// Copyright 2026 The ThunderID Authors
// SPDX-License-Identifier: Apache-2.0

import {describe, expect, it} from 'vitest';
import TelemetryNames from '../TelemetryNames';

describe('TelemetryNames', () => {
  it('names a page from its route pattern', () => {
    expect(TelemetryNames.pageName('/organizations/:org/applications')).toBe('application.list-view');
    expect(TelemetryNames.pageName('/applications/:id')).toBe('application.detail-view');
    expect(TelemetryNames.pageName('/applications/create')).toBe('application.create-view');
    expect(TelemetryNames.pageName('/applications/:id/settings')).toBe('setting.list-view');
    expect(TelemetryNames.pageName('/applications/:id/status')).toBe('application.status-view');
    expect(TelemetryNames.pageName('/organizations/:org/home')).toBe('organization.home-view');
    expect(TelemetryNames.pageName('/organization-units/:id')).toBe('organization-unit.detail-view');
    expect(TelemetryNames.pageName('/policies')).toBe('policy.list-view');
    expect(TelemetryNames.pageName('/')).toBe('app.home-view');
    expect(TelemetryNames.pageName('/home')).toBe('app.home-view');
  });

  it('names a collection right below another as a view of the first', () => {
    expect(TelemetryNames.pageName('/applications/types')).toBe('application.types-view');
    expect(TelemetryNames.pageName('/organizations/:org/applications/types')).toBe('application.types-view');
    // An id between them still makes the lower one a collection of its own.
    expect(TelemetryNames.pageName('/projects/:project/applications')).toBe('application.list-view');
    expect(TelemetryNames.pageName('/applications/:id/settings')).toBe('setting.list-view');
  });

  it('reads plurals by English spelling, with no list of words', () => {
    expect(TelemetryNames.singular('applications')).toBe('application');
    expect(TelemetryNames.singular('policies')).toBe('policy');
    expect(TelemetryNames.singular('addresses')).toBe('address');
    expect(TelemetryNames.singular('boxes')).toBe('box');
    expect(TelemetryNames.isCollection('access')).toBe(false);
    expect(TelemetryNames.isCollection('status')).toBe(false);
    expect(TelemetryNames.isCollection('settings')).toBe(true);
  });

  it('adds the prefix to a full name only when one is set', () => {
    expect(new TelemetryNames('acme').full('application.create')).toBe('acme.application.create');
    expect(new TelemetryNames().full('application.create')).toBe('application.create');
  });

  it('keeps only the first segment of a link path, when it is a plain word', () => {
    expect(TelemetryNames.linkPath('/guides/getting-started')).toBe('/guides/{id}');
    expect(TelemetryNames.linkPath('/users/alice')).toBe('/users/{id}');
    expect(TelemetryNames.linkPath('/reset/ABCDEFGHIJKLMNOPQRSTUVWX/confirm')).toBe('/reset/{id}/{id}');
    expect(TelemetryNames.linkPath('/a/')).toBe('/a/');
    expect(TelemetryNames.linkPath('/12345/orders')).toBe('/{id}/{id}');
    expect(TelemetryNames.linkPath('/')).toBe('/');
  });

  it('never accepts a trailing line break in a whole-string pattern', () => {
    expect(TelemetryNames.isValidName('application.create\n')).toBe(false);
    expect(TelemetryNames.linkPath('/guides\n')).toBe('/{id}');
    expect(TelemetryNames.matches('/oauth2/token\n', '/oauth2/token')).toBe(false);
  });

  it('accepts only lower-case <type>.<action> names, and drops data that could be personal', () => {
    expect(TelemetryNames.isValidName('application.template-pick')).toBe(true);
    expect(TelemetryNames.isValidName('user.alice@example.com')).toBe(false);
    expect(TelemetryNames.isValidName('Application.Create')).toBe(false);
    expect(TelemetryNames.isValidName('single')).toBe(false);
    expect(
      TelemetryNames.safeData({
        email: 'a@b.com',
        long: 'x'.repeat(65),
        text: 'two words',
        type: 'spa',
        url: 'https://x.com',
      }),
    ).toEqual({type: 'spa'});
  });

  it('matches one segment with * and the rest with **', () => {
    expect(TelemetryNames.matches('/settings/general', '/settings/*')).toBe(true);
    expect(TelemetryNames.matches('/settings/general/advanced', '/settings/*')).toBe(false);
    expect(TelemetryNames.matches('/settings/general/advanced', '/settings/**')).toBe(true);
    expect(TelemetryNames.matches('https://abc.com/x.y', 'https://abc.com/*')).toBe(true);
    expect(TelemetryNames.matches('https://abcXcom/x', 'https://abc.com/*')).toBe(false);
  });
});

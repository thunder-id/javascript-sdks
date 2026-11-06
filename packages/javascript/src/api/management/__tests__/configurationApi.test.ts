// Copyright 2026 The ThunderID Authors
// SPDX-License-Identifier: Apache-2.0

import {describe, expect, it} from 'vitest';
import {
  baseUrl,
  createFetcher,
  FetcherMock,
  itMapsForbiddenAndNotFound,
  itSendsRequests,
  requests,
} from './helpers/managementRequests';
import createConfigurationVersion from '../configuration/createConfigurationVersion';
import deleteImportedConfiguration from '../configuration/deleteImportedConfiguration';
import exportConfiguration from '../configuration/exportConfiguration';
import getConfigurationVersion from '../configuration/getConfigurationVersion';
import getConfigurationVersions from '../configuration/getConfigurationVersions';
import importConfiguration from '../configuration/importConfiguration';
import createDesignTheme from '../design/createDesignTheme';
import createLayout from '../design/createLayout';
import deleteDesignTheme from '../design/deleteDesignTheme';
import deleteLayout from '../design/deleteLayout';
import getDesignTheme from '../design/getDesignTheme';
import getDesignThemes from '../design/getDesignThemes';
import getDesignThemeUsages from '../design/getDesignThemeUsages';
import getLayout from '../design/getLayout';
import getLayouts from '../design/getLayouts';
import getLayoutUsages from '../design/getLayoutUsages';
import resolveDesign from '../design/resolveDesign';
import updateDesignTheme from '../design/updateDesignTheme';
import updateLayout from '../design/updateLayout';
import applyGatewayConfiguration from '../gateways/applyGatewayConfiguration';
import createGateway from '../gateways/createGateway';
import createGatewaySecret from '../gateways/createGatewaySecret';
import createGatewayVariable from '../gateways/createGatewayVariable';
import deleteGateway from '../gateways/deleteGateway';
import deleteGatewaySecret from '../gateways/deleteGatewaySecret';
import deleteGatewayVariable from '../gateways/deleteGatewayVariable';
import getGateway from '../gateways/getGateway';
import getGatewayAppliedConfiguration from '../gateways/getGatewayAppliedConfiguration';
import getGatewayAppliedVersion from '../gateways/getGatewayAppliedVersion';
import getGatewayConfigurationDiff from '../gateways/getGatewayConfigurationDiff';
import getGatewayMaster from '../gateways/getGatewayMaster';
import getGatewayMasterHistory from '../gateways/getGatewayMasterHistory';
import getGatewayMasterResource from '../gateways/getGatewayMasterResource';
import getGateways from '../gateways/getGateways';
import getGatewaySecret from '../gateways/getGatewaySecret';
import getGatewaySecrets from '../gateways/getGatewaySecrets';
import getGatewayVariable from '../gateways/getGatewayVariable';
import getGatewayVariables from '../gateways/getGatewayVariables';
import revertGatewayConfiguration from '../gateways/revertGatewayConfiguration';
import updateGateway from '../gateways/updateGateway';
import updateGatewaySecret from '../gateways/updateGatewaySecret';
import updateGatewayVariable from '../gateways/updateGatewayVariable';
import deleteTranslation from '../i18n/deleteTranslation';
import deleteTranslations from '../i18n/deleteTranslations';
import getLanguages from '../i18n/getLanguages';
import resolveTranslation from '../i18n/resolveTranslation';
import resolveTranslations from '../i18n/resolveTranslations';
import setTranslation from '../i18n/setTranslation';
import setTranslations from '../i18n/setTranslations';
import createNotificationTemplate from '../notification-templates/createNotificationTemplate';
import deleteNotificationTemplate from '../notification-templates/deleteNotificationTemplate';
import getNotificationTemplate from '../notification-templates/getNotificationTemplate';
import getNotificationTemplates from '../notification-templates/getNotificationTemplates';
import updateNotificationTemplate from '../notification-templates/updateNotificationTemplate';
import createSecret from '../secrets/createSecret';
import deleteSecret from '../secrets/deleteSecret';
import getSecret from '../secrets/getSecret';
import getSecrets from '../secrets/getSecrets';
import updateSecret from '../secrets/updateSecret';
import getServerConfig from '../server-config/getServerConfig';
import getServerConfigs from '../server-config/getServerConfigs';
import updateServerConfig from '../server-config/updateServerConfig';
import createVariable from '../variables/createVariable';
import deleteVariable from '../variables/deleteVariable';
import getVariable from '../variables/getVariable';
import getVariables from '../variables/getVariables';
import updateVariable from '../variables/updateVariable';

const sms = {content: {body: 'Code {{otp}}'}, displayName: 'OTP', handle: 'otp', ouId: 'ou-1'};
const theme = {displayName: 'Brand', handle: 'brand', theme: {primary: '#000'}};
const layout = {displayName: 'Centered', handle: 'centered', layout: {}};
const gatewayId = 'gw-1';

describe('notification templates API', () => {
  itSendsRequests([
    [
      'getNotificationTemplates',
      (fetcher) => getNotificationTemplates({baseUrl, channel: 'email', fetcher, limit: 5}),
      'GET',
      '/notification-templates/email/templates?limit=5',
    ],
    [
      'getNotificationTemplate',
      (fetcher) => getNotificationTemplate({baseUrl, channel: 'sms', fetcher, templateId: 't-1'}),
      'GET',
      '/notification-templates/sms/templates/t-1',
    ],
    [
      'createNotificationTemplate',
      (fetcher) => createNotificationTemplate({baseUrl, channel: 'sms', fetcher, payload: sms}),
      'POST',
      '/notification-templates/sms/templates',
      sms,
    ],
    [
      'updateNotificationTemplate',
      (fetcher) =>
        updateNotificationTemplate({
          baseUrl,
          channel: 'sms',
          fetcher,
          payload: {content: sms.content, displayName: 'OTP'},
          templateId: 't-1',
        }),
      'PUT',
      '/notification-templates/sms/templates/t-1',
      {content: sms.content, displayName: 'OTP'},
    ],
    [
      'deleteNotificationTemplate',
      (fetcher) => deleteNotificationTemplate({baseUrl, channel: 'email', fetcher, templateId: 't-1'}),
      'DELETE',
      '/notification-templates/email/templates/t-1',
    ],
  ]);

  itMapsForbiddenAndNotFound('getNotificationTemplate', (fetcher) =>
    getNotificationTemplate({baseUrl, channel: 'email', fetcher, templateId: 't-1'}),
  );
});

describe('design API', () => {
  itSendsRequests([
    ['getDesignThemes', (fetcher) => getDesignThemes({baseUrl, fetcher, offset: 5}), 'GET', '/design/themes?offset=5'],
    ['getDesignTheme', (fetcher) => getDesignTheme({baseUrl, fetcher, themeId: 'th-1'}), 'GET', '/design/themes/th-1'],
    [
      'createDesignTheme',
      (fetcher) => createDesignTheme({baseUrl, fetcher, payload: theme}),
      'POST',
      '/design/themes',
      theme,
    ],
    [
      'updateDesignTheme',
      (fetcher) => updateDesignTheme({baseUrl, fetcher, payload: theme, themeId: 'th-1'}),
      'PUT',
      '/design/themes/th-1',
      theme,
    ],
    [
      'deleteDesignTheme',
      (fetcher) => deleteDesignTheme({baseUrl, fetcher, themeId: 'th-1'}),
      'DELETE',
      '/design/themes/th-1',
    ],
    [
      'getDesignThemeUsages',
      (fetcher) => getDesignThemeUsages({baseUrl, fetcher, limit: 1, themeId: 'th-1'}),
      'GET',
      '/design/themes/th-1/usages?limit=1',
    ],
    ['getLayouts', (fetcher) => getLayouts({baseUrl, fetcher}), 'GET', '/design/layouts'],
    ['getLayout', (fetcher) => getLayout({baseUrl, fetcher, layoutId: 'l-1'}), 'GET', '/design/layouts/l-1'],
    ['createLayout', (fetcher) => createLayout({baseUrl, fetcher, payload: layout}), 'POST', '/design/layouts', layout],
    [
      'updateLayout',
      (fetcher) => updateLayout({baseUrl, fetcher, layoutId: 'l-1', payload: layout}),
      'PUT',
      '/design/layouts/l-1',
      layout,
    ],
    ['deleteLayout', (fetcher) => deleteLayout({baseUrl, fetcher, layoutId: 'l-1'}), 'DELETE', '/design/layouts/l-1'],
    [
      'getLayoutUsages',
      (fetcher) => getLayoutUsages({baseUrl, fetcher, layoutId: 'l-1'}),
      'GET',
      '/design/layouts/l-1/usages',
    ],
    [
      'resolveDesign',
      (fetcher) => resolveDesign({baseUrl, fetcher, id: 'app-1', type: 'APP'}),
      'GET',
      '/design/resolve?id=app-1&type=APP',
    ],
  ]);

  itMapsForbiddenAndNotFound('getLayout', (fetcher) => getLayout({baseUrl, fetcher, layoutId: 'l-1'}));

  it('uses the design endpoint override as the collection URL', async () => {
    const fetcher: FetcherMock = createFetcher();

    await getDesignTheme({baseUrl, fetcher, themeId: 'th-1', url: 'https://rs.example.com/design'});

    expect(requests(fetcher)[0].url).toBe('https://rs.example.com/design/themes/th-1');
  });
});

describe('translations API', () => {
  itSendsRequests([
    ['getLanguages', (fetcher) => getLanguages({baseUrl, fetcher}), 'GET', '/i18n/languages'],
    [
      'resolveTranslations',
      (fetcher) => resolveTranslations({baseUrl, fetcher, language: 'en-US', namespace: 'auth'}),
      'GET',
      '/i18n/languages/en-US/translations/resolve?namespace=auth',
    ],
    [
      'resolveTranslation',
      (fetcher) => resolveTranslation({baseUrl, fetcher, key: 'signin.title', language: 'en-US', namespace: 'auth'}),
      'GET',
      '/i18n/languages/en-US/translations/ns/auth/keys/signin.title/resolve',
    ],
    [
      'setTranslations',
      (fetcher) => setTranslations({baseUrl, fetcher, language: 'fr-FR', payload: {translations: {auth: {a: 'b'}}}}),
      'POST',
      '/i18n/languages/fr-FR/translations',
      {translations: {auth: {a: 'b'}}},
    ],
    [
      'deleteTranslations',
      (fetcher) => deleteTranslations({baseUrl, fetcher, language: 'fr-FR'}),
      'DELETE',
      '/i18n/languages/fr-FR/translations',
    ],
    [
      'setTranslation',
      (fetcher) =>
        setTranslation({baseUrl, fetcher, key: 'a b', language: 'fr-FR', namespace: 'auth', payload: {value: 'c'}}),
      'POST',
      '/i18n/languages/fr-FR/translations/ns/auth/keys/a%20b',
      {value: 'c'},
    ],
    [
      'deleteTranslation',
      (fetcher) => deleteTranslation({baseUrl, fetcher, key: 'a', language: 'fr-FR', namespace: 'auth'}),
      'DELETE',
      '/i18n/languages/fr-FR/translations/ns/auth/keys/a',
    ],
  ]);

  itMapsForbiddenAndNotFound('resolveTranslations', (fetcher) =>
    resolveTranslations({baseUrl, fetcher, language: 'xx'}),
  );
});

describe('server configuration API', () => {
  itSendsRequests([
    ['getServerConfigs', (fetcher) => getServerConfigs({baseUrl, fetcher}), 'GET', '/server-config'],
    ['getServerConfig', (fetcher) => getServerConfig({baseUrl, fetcher, name: 'flow'}), 'GET', '/server-config/flow'],
    [
      'updateServerConfig',
      (fetcher) => updateServerConfig({baseUrl, fetcher, name: 'notification', payload: {defaultEmailSenderId: 'c-1'}}),
      'PUT',
      '/server-config/notification',
      {defaultEmailSenderId: 'c-1'},
    ],
  ]);

  itMapsForbiddenAndNotFound('getServerConfig', (fetcher) => getServerConfig({baseUrl, fetcher, name: 'flow'}));
});

describe('gateways API', () => {
  itSendsRequests([
    ['getGateways', (fetcher) => getGateways({baseUrl, fetcher}), 'GET', '/gateways'],
    ['getGateway', (fetcher) => getGateway({baseUrl, fetcher, gatewayId}), 'GET', '/gateways/gw-1'],
    [
      'createGateway',
      (fetcher) => createGateway({baseUrl, fetcher, payload: {baseUrl: 'https://gw', name: 'Edge'}}),
      'POST',
      '/gateways',
      {baseUrl: 'https://gw', name: 'Edge'},
    ],
    [
      'updateGateway',
      (fetcher) => updateGateway({baseUrl, fetcher, gatewayId, payload: {name: 'Edge'}}),
      'PUT',
      '/gateways/gw-1',
      {name: 'Edge'},
    ],
    ['deleteGateway', (fetcher) => deleteGateway({baseUrl, fetcher, gatewayId}), 'DELETE', '/gateways/gw-1'],
    [
      'applyGatewayConfiguration',
      (fetcher) => applyGatewayConfiguration({baseUrl, fetcher, gatewayId, payload: {dryRun: true}}),
      'POST',
      '/gateways/gw-1/apply',
      {dryRun: true},
    ],
    [
      'applyGatewayConfiguration without a payload',
      (fetcher) => applyGatewayConfiguration({baseUrl, fetcher, gatewayId}),
      'POST',
      '/gateways/gw-1/apply',
    ],
    [
      'revertGatewayConfiguration',
      (fetcher) => revertGatewayConfiguration({baseUrl, fetcher, gatewayId, payload: {confirmRemovals: true}}),
      'POST',
      '/gateways/gw-1/revert',
      {confirmRemovals: true},
    ],
    [
      'getGatewayConfigurationDiff',
      (fetcher) => getGatewayConfigurationDiff({baseUrl, fetcher, gatewayId, version: 'latest'}),
      'GET',
      '/gateways/gw-1/diff?version=latest',
    ],
    [
      'getGatewayAppliedConfiguration',
      (fetcher) => getGatewayAppliedConfiguration({baseUrl, fetcher, gatewayId}),
      'GET',
      '/gateways/gw-1/applied-configuration',
    ],
    [
      'getGatewayAppliedVersion',
      (fetcher) => getGatewayAppliedVersion({baseUrl, fetcher, gatewayId}),
      'GET',
      '/gateways/gw-1/applied-version',
    ],
    ['getGatewayMaster', (fetcher) => getGatewayMaster({baseUrl, fetcher, gatewayId}), 'GET', '/gateways/gw-1/master'],
    [
      'getGatewayMasterHistory',
      (fetcher) => getGatewayMasterHistory({baseUrl, fetcher, gatewayId}),
      'GET',
      '/gateways/gw-1/master/history',
    ],
    [
      'getGatewayMasterResource',
      (fetcher) =>
        getGatewayMasterResource({baseUrl, fetcher, gatewayId, resourceId: 'a/b c', resourceType: 'application'}),
      'GET',
      '/gateways/gw-1/master/resources/application/a%2Fb%20c',
    ],
    [
      'getGatewayVariables',
      (fetcher) => getGatewayVariables({baseUrl, fetcher, gatewayId, limit: 5, names: ['A', 'B']}),
      'GET',
      '/gateways/gw-1/variables?limit=5&names=A%2CB',
    ],
    [
      'getGatewayVariable',
      (fetcher) => getGatewayVariable({baseUrl, fetcher, gatewayId, name: 'A'}),
      'GET',
      '/gateways/gw-1/variables/A',
    ],
    [
      'createGatewayVariable',
      (fetcher) => createGatewayVariable({baseUrl, fetcher, gatewayId, payload: {name: 'A', value: '1'}}),
      'POST',
      '/gateways/gw-1/variables',
      {name: 'A', value: '1'},
    ],
    [
      'updateGatewayVariable',
      (fetcher) => updateGatewayVariable({baseUrl, fetcher, gatewayId, name: 'A', payload: {value: '2'}}),
      'PUT',
      '/gateways/gw-1/variables/A',
      {value: '2'},
    ],
    [
      'deleteGatewayVariable',
      (fetcher) => deleteGatewayVariable({baseUrl, fetcher, gatewayId, name: 'A'}),
      'DELETE',
      '/gateways/gw-1/variables/A',
    ],
    [
      'getGatewaySecrets',
      (fetcher) => getGatewaySecrets({baseUrl, fetcher, filter: 'name sw "S"', gatewayId}),
      'GET',
      '/gateways/gw-1/secrets?filter=name+sw+%22S%22',
    ],
    [
      'getGatewaySecret',
      (fetcher) => getGatewaySecret({baseUrl, fetcher, gatewayId, name: 'S'}),
      'GET',
      '/gateways/gw-1/secrets/S',
    ],
    [
      'createGatewaySecret',
      (fetcher) => createGatewaySecret({baseUrl, fetcher, gatewayId, payload: {name: 'S', value: 'x'}}),
      'POST',
      '/gateways/gw-1/secrets',
      {name: 'S', value: 'x'},
    ],
    [
      'updateGatewaySecret',
      (fetcher) => updateGatewaySecret({baseUrl, fetcher, gatewayId, name: 'S', payload: {value: 'y'}}),
      'PUT',
      '/gateways/gw-1/secrets/S',
      {value: 'y'},
    ],
    [
      'deleteGatewaySecret',
      (fetcher) => deleteGatewaySecret({baseUrl, fetcher, gatewayId, name: 'S'}),
      'DELETE',
      '/gateways/gw-1/secrets/S',
    ],
  ]);

  itMapsForbiddenAndNotFound('getGatewayVariable', (fetcher) =>
    getGatewayVariable({baseUrl, fetcher, gatewayId, name: 'A'}),
  );

  itMapsForbiddenAndNotFound('getGatewayMasterResource', (fetcher) =>
    getGatewayMasterResource({baseUrl, fetcher, gatewayId, resourceId: 'app-1', resourceType: 'application'}),
  );

  it('returns the gateway master as the server sent it', async () => {
    const master = {entries: [{key: 'application/app-1', state: 'deployed'}], gatewayId, number: 3};

    await expect(getGatewayMaster({baseUrl, fetcher: createFetcher(master), gatewayId})).resolves.toEqual(master);
  });

  it('refuses a blank gateway master resource identifier before sending anything', async () => {
    const fetcher: FetcherMock = createFetcher();

    await expect(
      getGatewayMasterResource({baseUrl, fetcher, gatewayId, resourceId: ' ', resourceType: 'application'}),
    ).rejects.toMatchObject({code: 'getGatewayMasterResource-ValidationError-002'});
    expect(fetcher).not.toHaveBeenCalled();
  });

  it('uses the gateways endpoint override for the gateway master', async () => {
    const fetcher: FetcherMock = createFetcher();

    await getGatewayMasterHistory({baseUrl, fetcher, gatewayId, url: 'https://rs.example.com/gateways'});

    expect(requests(fetcher)[0].url).toBe('https://rs.example.com/gateways/gw-1/master/history');
  });

  it('uses the gateways endpoint override as the collection URL', async () => {
    const fetcher: FetcherMock = createFetcher();

    await getGatewaySecret({baseUrl, fetcher, gatewayId, name: 'S', url: 'https://rs.example.com/gateways'});

    expect(requests(fetcher)[0].url).toBe('https://rs.example.com/gateways/gw-1/secrets/S');
  });
});

describe('variables and secrets API', () => {
  itSendsRequests([
    [
      'getVariables',
      (fetcher) => getVariables({baseUrl, fetcher, filter: 'name sw "A"', limit: 2, names: ['A'], offset: 1}),
      'GET',
      '/variables?filter=name+sw+%22A%22&limit=2&names=A&offset=1',
    ],
    ['getVariable', (fetcher) => getVariable({baseUrl, fetcher, name: 'A B'}), 'GET', '/variables/A%20B'],
    [
      'createVariable',
      (fetcher) => createVariable({baseUrl, fetcher, payload: {name: 'A', value: '1'}}),
      'POST',
      '/variables',
      {name: 'A', value: '1'},
    ],
    [
      'updateVariable',
      (fetcher) => updateVariable({baseUrl, fetcher, name: 'A', payload: {value: '2'}}),
      'PUT',
      '/variables/A',
      {value: '2'},
    ],
    ['deleteVariable', (fetcher) => deleteVariable({baseUrl, fetcher, name: 'A'}), 'DELETE', '/variables/A'],
    ['getSecrets', (fetcher) => getSecrets({baseUrl, fetcher, names: ['S', 'T']}), 'GET', '/secrets?names=S%2CT'],
    ['getSecret', (fetcher) => getSecret({baseUrl, fetcher, name: 'S'}), 'GET', '/secrets/S'],
    [
      'createSecret',
      (fetcher) => createSecret({baseUrl, fetcher, payload: {name: 'S', value: 'x'}}),
      'POST',
      '/secrets',
      {name: 'S', value: 'x'},
    ],
    [
      'updateSecret',
      (fetcher) => updateSecret({baseUrl, fetcher, name: 'S', payload: {value: 'y'}}),
      'PUT',
      '/secrets/S',
      {value: 'y'},
    ],
    ['deleteSecret', (fetcher) => deleteSecret({baseUrl, fetcher, name: 'S'}), 'DELETE', '/secrets/S'],
  ]);

  itMapsForbiddenAndNotFound('getSecret', (fetcher) => getSecret({baseUrl, fetcher, name: 'S'}));

  it('uses the secrets endpoint override as the collection URL', async () => {
    const fetcher: FetcherMock = createFetcher();

    await getSecret({baseUrl, fetcher, name: 'S', url: 'https://vault.example.com/secrets'});

    expect(requests(fetcher)[0].url).toBe('https://vault.example.com/secrets/S');
  });
});

describe('configuration versions, import and export API', () => {
  itSendsRequests([
    [
      'getConfigurationVersions',
      (fetcher) => getConfigurationVersions({baseUrl, fetcher}),
      'GET',
      '/configuration-versions',
    ],
    [
      'getConfigurationVersion',
      (fetcher) => getConfigurationVersion({baseUrl, fetcher, version: 'a1b2c3d'}),
      'GET',
      '/configuration-versions/a1b2c3d',
    ],
    [
      'createConfigurationVersion',
      (fetcher) => createConfigurationVersion({baseUrl, fetcher, payload: {name: 'v1'}}),
      'POST',
      '/configuration-versions',
      {name: 'v1'},
    ],
    [
      'exportConfiguration',
      (fetcher) => exportConfiguration({baseUrl, fetcher, payload: {applications: ['*']}}),
      'POST',
      '/export',
      {applications: ['*']},
    ],
    [
      'importConfiguration',
      (fetcher) => importConfiguration({baseUrl, fetcher, payload: {content: 'kind: Application', dryRun: true}}),
      'POST',
      '/import',
      {content: 'kind: Application', dryRun: true},
    ],
    [
      'deleteImportedConfiguration',
      (fetcher) =>
        deleteImportedConfiguration({baseUrl, fetcher, payload: {resourceKey: 'my-app', resourceType: 'application'}}),
      'POST',
      '/import/delete',
      {resourceKey: 'my-app', resourceType: 'application'},
    ],
  ]);

  itMapsForbiddenAndNotFound('getConfigurationVersion', (fetcher) =>
    getConfigurationVersion({baseUrl, fetcher, version: 'v'}),
  );

  it('uses the import endpoint override as the collection URL', async () => {
    const fetcher: FetcherMock = createFetcher();

    await deleteImportedConfiguration({
      baseUrl,
      fetcher,
      payload: {resourceKey: 'k', resourceType: 'application'},
      url: 'https://rs.example.com/import',
    });

    expect(requests(fetcher)[0].url).toBe('https://rs.example.com/import/delete');
  });
});

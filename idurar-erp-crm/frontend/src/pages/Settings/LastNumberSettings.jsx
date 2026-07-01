import LastNumberSettingsModule from '@/modules/SettingModule/LastNumberSettingsModule';

export default function LastNumberSettings() {
  const entity = 'setting';

  const configPage = {
    entity,
    settingsCategory: 'last_number_settings',
    SETTINGS_TITLE: '最後號碼',
  };
  return <LastNumberSettingsModule config={configPage} />;
}

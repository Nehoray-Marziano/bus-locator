AppSettingsPage({
  build() {
    return Section({}, [
      Text({ paragraph: true }, 'Meitar Bus · line 440'),
      Text(
        { paragraph: true },
        'Board in Meitar before 10:00, Jerusalem from 10:00, and Meitar for tomorrow from 18:00. Uses Israel time every day.',
      ),
      TextInput({
        label: 'Switch to return journey (HH:MM)',
        settingsKey: 'switchTime',
        placeholder: '10:00',
      }),
      TextInput({
        label: 'Prepare for tomorrow from (HH:MM)',
        settingsKey: 'eveningTime',
        placeholder: '18:00',
      }),
      Toggle({ label: 'Demo mode · sample arrivals', settingsKey: 'demo' }),
      Text(
        { paragraph: true },
        'Requests only when you open the watch app or tap Refresh, at most once per 30 seconds. No background tracking. Demo mode uses no internet. After changing settings, reopen the app.',
      ),
    ])
  },
})

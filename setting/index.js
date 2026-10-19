AppSettingsPage({
  build() {
    return Section({}, [
      Text({ paragraph: true }, 'Meitar Bus · line 440'),
      Text(
        { paragraph: true },
        'Morning: 14100 · Metar Junction → Jerusalem. Return: 222 · Teddy Stadium / Beitar → Meitar. Runs every day; switches using Israel time.',
      ),
      TextInput({
        label: 'Switch to return journey (HH:MM)',
        settingsKey: 'switchTime',
        placeholder: '12:00',
      }),
      Toggle({ label: 'Demo mode · sample arrivals', settingsKey: 'demo' }),
      Text(
        { paragraph: true },
        'Requests only when you open the watch app or tap Refresh, at most once per 30 seconds. No background tracking. Demo mode uses no internet. After changing settings, reopen the app.',
      ),
    ])
  },
})

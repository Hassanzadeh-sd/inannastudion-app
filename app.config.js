// Two apps from one codebase:
//   default            → kiosk app  «استادیو اینانا» (com.inannastudio.leads)
//   APP_VARIANT=employee → employee app «اینانا همکار» (com.inannastudio.employee)
// The employee app opens straight into the server-backed customers list.
const IS_EMPLOYEE = process.env.APP_VARIANT === 'employee';

module.exports = ({ config }) => ({
  ...config,
  name: IS_EMPLOYEE ? 'اینانا همکار' : config.name,
  ...(IS_EMPLOYEE ? { icon: './assets/images/icon-employee.png' } : {}),
  android: {
    ...config.android,
    package: IS_EMPLOYEE ? 'com.inannastudio.employee' : config.android.package,
    ...(IS_EMPLOYEE
      ? {
          adaptiveIcon: {
            backgroundColor: '#E9E9D5',
            foregroundImage: './assets/images/android-icon-foreground.png',
            monochromeImage: './assets/images/android-icon-monochrome.png',
          },
        }
      : {}),
  },
  extra: {
    ...config.extra,
    variant: IS_EMPLOYEE ? 'employee' : 'kiosk',
  },
});

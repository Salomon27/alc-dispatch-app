window.OneSignalDeferred = window.OneSignalDeferred || [];
OneSignalDeferred.push(async function(OneSignal) {
    const basePath = window.location.pathname.substring(0, window.location.pathname.lastIndexOf('/') + 1);
    const fullPath = window.location.origin + basePath;
    
    // Configuration commune
    await OneSignal.init({
        appId: "c3645588-b84c-4969-bd4c-9218abdbc448",
        safari_web_id: "web.onesignal.auto.087eca46-faed-450d-af5b-90e7f525c88c",
        serviceWorkerPath: fullPath + "sw.js",
        serviceWorkerParam: { scope: basePath },
        notifyButton: {
            enable: true,
            position: 'bottom-left',
            size: 'medium',
            theme: 'default',
            colors: {
                'circle.background': '#1e3a8a',
                'circle.foreground': 'white'
            },
            offset: {
                bottom: '100px',
                left: '20px'
            }
        }
    });

    // Identification automatique si connecté
    const userId = localStorage.getItem('alc_userId');
    const role = localStorage.getItem('alc_role');
    
    if (userId && role) {
        if (role === 'patronne') {
            OneSignal.login("boss_patronne");
        } else {
            OneSignal.login(userId);
        }
    }
});

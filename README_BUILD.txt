Butz-Liftparts Konfigurator – Android

Die Web-App V32 ist vollständig unter app/src/main/assets/web eingebettet.
Auf Smartphones wird die Oberfläche über eine mobile Navigation mit drei Tabs dargestellt:
Konfiguration | Vorschau | Übersicht.

APK bauen:
1. Projekt in Android Studio öffnen und "Build APK(s)" ausführen.
oder
2. Projekt in ein GitHub-Repository laden. Die enthaltene GitHub Action .github/workflows/build-apk.yml erzeugt automatisch app-debug.apk als Workflow-Artefakt.

App-ID: de.butzliftparts.konfigurator
minSdk: 26
Target/Compile SDK: 35

Hinweis: Supabase bzw. servergestützte Funktionen benötigen weiterhin eine Internetverbindung.

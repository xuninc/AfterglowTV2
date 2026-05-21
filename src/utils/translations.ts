export type SupportedLanguage = 'en' | 'es' | 'fr' | 'de' | 'it' | 'pt' | 'ja';

export interface TranslationDict {
  // Navigation
  navLiveTv: string;
  navVod: string;
  navDvr: string;
  navVault: string;
  navSettings: string;
  navTrialDays: string;
  navTrialExpired: string;
  navPremiumActive: string;

  // Setup Screen
  setupTitle: string;
  setupVersion: string;
  setupSub: string;
  setupDemoBtn: string;
  setupDemoDesc: string;
  setupLinkHeader: string;
  setupLabelPlaceholder: string;
  setupUrlPlaceholder: string;
  setupConnectBtn: string;
  setupOrText: string;
  loadingChannels: string;

  // TV Guide (EPG)
  epgCategoryAll: string;
  epgSearchPlaceholder: string;
  epgLiveLabel: string;
  epgNoChannels: string;
  epgRecordBtn: string;
  epgRecordingStarted: string;
  epgNoPrograms: string;

  // VOD Video on Demand
  vodHeader: string;
  vodSub: string;
  vodSearchPlaceholder: string;
  vodLayoutGrid: string;
  vodLayoutShelf: string;
  vodLayoutEpg: string;
  vodNoMedia: string;
  vodPlayStream: string;
  vodAddedToLib: string;

  // DVR Panel
  dvrHeader: string;
  dvrSub: string;
  dvrTabSchedule: string;
  dvrTabRecordings: string;
  dvrNoSchedule: string;
  dvrNoRecordings: string;
  dvrPending: string;
  dvrRecording: string;
  dvrCompleted: string;
  dvrFailed: string;
  dvrCancelRecording: string;
  dvrDeleteRecording: string;
  dvrRecordedOn: string;

  // Media Library Vault
  vaultHeader: string;
  vaultSub: string;
  vaultDirectories: string;
  vaultAddDirBtn: string;
  vaultScanning: string;
  vaultScannedCount: string;
  vaultAutoEnrich: string;
  vaultCleanTitles: string;

  // Settings Panel
  setSystemConf: string;
  setSystemSub: string;
  setActiveConnections: string;
  setLinkFeed: string;
  setConnectedPortals: string;
  setPlaceholderName: string;
  setPlaceholderUrl: string;
  setBtnConnect: string;
  setBtnReset: string;
  setMsgLinked: string;
  setThemeHeader: string;
  setThemeSub: string;
  setEpgHeader: string;
  setEpgSub: string;
  setEpgSyncBtn: string;
  setLanguageLabel: string;
  setLanguageDesc: string;

  // Paywall
  paywallPremiumHeader: string;
  paywallTrialEnd: string;
  paywallTrialDaysLeft: string;
  paywallUpgradeBtn: string;
  paywallFeature1: string;
  paywallFeature2: string;
  paywallFeature3: string;
  paywallFeaturesHeader: string;
}

export const TRANSLATIONS: Record<SupportedLanguage, TranslationDict> = {
  en: {
    navLiveTv: "LIVE TV",
    navVod: "VOD CINEMA",
    navDvr: "DVR CAPTURE",
    navVault: "METADATA VAULT",
    navSettings: "SETTINGS",
    navTrialDays: "DAYS REMAINING IN TRIAL",
    navTrialExpired: "TRIAL SYSTEM EXPIRED",
    navPremiumActive: "PREMIUM STATION ACTIVE",

    setupTitle: "AFTERGLOW TV",
    setupVersion: "V1.4 RECEIVER",
    setupSub: "High-Fidelity Station-Class Multimedia Receiver Engine",
    setupDemoBtn: "BOOTSTRAP WITH DEMO FEEDS",
    setupDemoDesc: "Preload cinematic open-source stream indicators immediately",
    setupLinkHeader: "LINK PROVIDER PORTAL",
    setupLabelPlaceholder: "E.g., Global Premium Stream",
    setupUrlPlaceholder: "Enter M3U stream index URL link",
    setupConnectBtn: "INITIALISE DECODER CHANNEL",
    setupOrText: "OR INITIALISE FROM CACHE",
    loadingChannels: "Downloading provider feeds & parsing elements...",

    epgCategoryAll: "All",
    epgSearchPlaceholder: "Search Channels...",
    epgLiveLabel: "LIVE",
    epgNoChannels: "No channels found in current category.",
    epgRecordBtn: "SCHEDULE RECORDING",
    epgRecordingStarted: "DVR job logged successfully!",
    epgNoPrograms: "No schedule grid datasets loaded for this channel.",

    vodHeader: "VIDEO ON DEMAND Cinema",
    vodSub: "Direct rendering metadata archive indexed from connected streams",
    vodSearchPlaceholder: "Search VOD Titles...",
    vodLayoutGrid: "Grid View",
    vodLayoutShelf: "Bento Shelf",
    vodLayoutEpg: "Details Slate",
    vodNoMedia: "No Video on Demand catalog synced.",
    vodPlayStream: "PLAY FEATURE FILM",
    vodAddedToLib: "Added to Offline Library database index!",

    dvrHeader: "DVR CONTROLS",
    dvrSub: "Simulate non-blocking, asynchronous stream capture with offline storage",
    dvrTabSchedule: "SCHEDULED CAPTURES",
    dvrTabRecordings: "RECORDED BROADCASTS",
    dvrNoSchedule: "No scheduled stream recording jobs active.",
    dvrNoRecordings: "No completed DVR disk records stored.",
    dvrPending: "PENDING",
    dvrRecording: "RECORDING LIVE",
    dvrCompleted: "SAVED TO DISC",
    dvrFailed: "FAILED",
    dvrCancelRecording: "CANCEL JOB",
    dvrDeleteRecording: "DELETE DISK FILE",
    dvrRecordedOn: "Recorded on",

    vaultHeader: "METADATA RECOVERY VAULT",
    vaultSub: "Index local folders, parse regex schemas, and inject into EPG guide timelines",
    vaultDirectories: "MONITORED MEDIA DIRECTORIES",
    vaultAddDirBtn: "TRACK FOLDER",
    vaultScanning: "Scanning filesystem...",
    vaultScannedCount: "scanned items locked",
    vaultAutoEnrich: "AUTOMATIC AI METADATA ENRICHMENT",
    vaultCleanTitles: "PRETTY-PRINT DETECTED RELEASES",

    setSystemConf: "CONFIGURATION // SYSTEMS",
    setSystemSub: "Adjust digital signals, portal accounts, and guide sync logs",
    setActiveConnections: "ACTIVE CONNECTIONS",
    setLinkFeed: "LINK EXTERNAL STREAM FEED",
    setConnectedPortals: "No connected portals found",
    setPlaceholderName: "Name of the connection (backup etc.)",
    setPlaceholderUrl: "M3U Stream URL...",
    setBtnConnect: "CONNECT INSTANCE",
    setBtnReset: "WIPE LOCAL DATA",
    setMsgLinked: "Playlist linked successfully!",
    setThemeHeader: "RECEIVER INTERFACE THEME",
    setThemeSub: "Adjust neon color aura, background density, and contrast templates",
    setEpgHeader: "EPG & XMLTV TIMELINE GUIDE",
    setEpgSub: "Specify an external XMLTV file path to sync show directories",
    setEpgSyncBtn: "SYNCHRONISE GUIDE DATA",
    setLanguageLabel: "INTERFACE LANGUAGE",
    setLanguageDesc: "Switch standard localization maps for Amazon distribution",

    paywallPremiumHeader: "AFTERGLOW PREMIUM",
    paywallTrialEnd: "Your 15-day evaluation trial of Afterglow Receiver has finished.",
    paywallTrialDaysLeft: "Days Remaining in Evaluation Period",
    paywallUpgradeBtn: "UNLOCK FULL ACCESS",
    paywallFeature1: "Stall-free high-bitrate stream decoder acceleration",
    paywallFeature2: "Simultaneous 4k recording tasks & DVR disk scheduler",
    paywallFeature3: "Full Gemini metadata parsing & custom cross-device profiles",
    paywallFeaturesHeader: "ENTITLEMENTS:"
  },
  es: {
    navLiveTv: "TV EN VIVO",
    navVod: "CINE VOD",
    navDvr: "CAPTURA DVR",
    navVault: "BÓVEDA DE METADATOS",
    navSettings: "AJUSTES",
    navTrialDays: "DÍAS RESTANTES DE PRUEBA",
    navTrialExpired: "SISTEMA DE PRUEBA EXPIRADO",
    navPremiumActive: "ESTACIÓN PREMIUM ACTIVA",

    setupTitle: "AFTERGLOW TV",
    setupVersion: "RECEPTOR V1.4",
    setupSub: "Motor Receptor Multimedia de Alta Fidelidad de Clase Estación",
    setupDemoBtn: "INICIAR CON CANALES DE DEMO",
    setupDemoDesc: "Precargar transmisiones cinematográficas de código abierto inmediatamente",
    setupLinkHeader: "VINCULAR PORTAL PROVEEDOR",
    setupLabelPlaceholder: "Ej., Transmisión Premium Global",
    setupUrlPlaceholder: "Ingrese el enlace URL del índice M3U",
    setupConnectBtn: "INICIALIZAR CANAL DECODIFICADOR",
    setupOrText: "O INICIALIZAR DESDE CACHÉ",
    loadingChannels: "Descargando transmisiones proveedor y analizando elementos...",

    epgCategoryAll: "Todo",
    epgSearchPlaceholder: "Buscar canales...",
    epgLiveLabel: "EN DIRECTO",
    epgNoChannels: "No se encontraron canales en la categoría actual.",
    epgRecordBtn: "PROGRAMAR GRABACIÓN",
    epgRecordingStarted: "¡Trabajo DVR registrado con éxito!",
    epgNoPrograms: "No hay datos de programación cargados para este canal.",

    vodHeader: "CINE BAJO DEMANDA (VOD)",
    vodSub: "Archivo de metadatos de renderizado directo indexado de transmisiones conectadas",
    vodSearchPlaceholder: "Buscar títulos de VOD...",
    vodLayoutGrid: "Vista de Cuadrícula",
    vodLayoutShelf: "Estante Bento",
    vodLayoutEpg: "Detalles Pizarra",
    vodNoMedia: "Ningún catálogo de VOD sincronizado.",
    vodPlayStream: "REPRODUCIR PELÍCULA",
    vodAddedToLib: "¡Agregado al índice de la biblioteca fuera de línea!",

    dvrHeader: "CONTROLES DVR",
    dvrSub: "Simular captura de transmisión asíncrona sin bloqueos con almacenamiento local",
    dvrTabSchedule: "GRABACIONES PROGRAMADAS",
    dvrTabRecordings: "TRANSMISIONES GRABADAS",
    dvrNoSchedule: "No hay grabaciones programadas de transmisiones activas.",
    dvrNoRecordings: "No hay registros de DVR guardados en disco.",
    dvrPending: "PENDIENTE",
    dvrRecording: "GRABANDO EN VIVO",
    dvrCompleted: "GUARDADO EN DISCO",
    dvrFailed: "FALLADO",
    dvrCancelRecording: "CANCELAR TRABAJO",
    dvrDeleteRecording: "ELIMINAR ARCHIVO",
    dvrRecordedOn: "Grabado el",

    vaultHeader: "BÓVEDA DE METADATOS",
    vaultSub: "Indexar carpetas locales, analizar esquemas regex e inyectar en la guía EPG",
    vaultDirectories: "DIRECTORIOS DE MEDIOS MONITOREADOS",
    vaultAddDirBtn: "RASTREAR CARPETA",
    vaultScanning: "Escaneando sistema de archivos...",
    vaultScannedCount: "elementos escaneados asegurados",
    vaultAutoEnrich: "ENRIQUECIMIENTO DE METADATOS ALIMENTADO POR IA",
    vaultCleanTitles: "TÍTULOS LIMPIOS Y REDISTRIBUIDOS",

    setSystemConf: "CONFIGURACIÓN // SISTEMAS",
    setSystemSub: "Ajustar señales digitales, cuentas de portal y registros de guía",
    setActiveConnections: "CONEXIONES ACTIVAS",
    setLinkFeed: "PORTAL DE CONEXIÓN RÁPIDA",
    setConnectedPortals: "No hay portales vinculados",
    setPlaceholderName: "Nombre de la conexión (ej. IPTV Alternativa)",
    setPlaceholderUrl: "M3U Stream URL...",
    setBtnConnect: "CONECTAR INSTANCIA",
    setBtnReset: "BORRAR DATOS LOCALES",
    setMsgLinked: "¡Lista de reproducción vinculada con éxito!",
    setThemeHeader: "TEMA DEL RECEPTOR",
    setThemeSub: "Modificar aura de color neón, densidad del fondo y plantillas de contraste",
    setEpgHeader: "GUÍA EPG Y TIMELINE XMLTV",
    setEpgSub: "Especifique una ruta de archivo XMLTV para sincronizar la guía",
    setEpgSyncBtn: "SINCRONIZAR GUÍA",
    setLanguageLabel: "IDIOMA DE INTERFAZ",
    setLanguageDesc: "Cambiar mapas de traducción para la distribución de Amazon",

    paywallPremiumHeader: "AFTERGLOW PREMIUM",
    paywallTrialEnd: "Tu período de prueba de evaluación de 15 días del receptor Afterglow ha finalizado.",
    paywallTrialDaysLeft: "Días restantes del periodo de evaluación",
    paywallUpgradeBtn: "DESBLOQUEAR ACCESO TOTAL",
    paywallFeature1: "Aceleración de decodificador de transmisiones de alta velocidad",
    paywallFeature2: "Grabación de transmisiones en 4k y almacenamiento DVR simultáneo",
    paywallFeature3: "Metadatos IA completos con Gemini y perfiles personalizados en la nube",
    paywallFeaturesHeader: "BENEFICIOS INCLUIDOS:"
  },
  fr: {
    navLiveTv: "TV EN DIRECT",
    navVod: "CINÉMA VOD",
    navDvr: "CAPTURE DVR",
    navVault: "BASE DE MÉTADONNÉES",
    navSettings: "RÉGLAGES",
    navTrialDays: "JOURS D'ÉVALUATION RESTANTS",
    navTrialExpired: "EXPIRATION DU SYSTÈME D'ÉVALUATION",
    navPremiumActive: "RÉCEPTEUR PREMIUM ACTIVÉ",

    setupTitle: "AFTERGLOW TV",
    setupVersion: "RÉCEPTEUR V1.4",
    setupSub: "Moteur de réception multimédia de qualité station haute fidélité",
    setupDemoBtn: "DÉMARRER AVEC FLUX DE DÉMONSTRATION",
    setupDemoDesc: "Précharger immédiatement les flux de diffusion en open source",
    setupLinkHeader: "LIER LE PORTAIL DU FOURNISSEUR",
    setupLabelPlaceholder: "Ex. Flux Premium Global",
    setupUrlPlaceholder: "Entrez l'URL de l'index des flux M3U",
    setupConnectBtn: "INITIALISER LE CANAL DU DÉCODEUR",
    setupOrText: "OU INITIALISER DEPUIS LE CACHE",
    loadingChannels: "Téléchargement des flux fournisseurs et analyse du contenu...",

    epgCategoryAll: "Tout",
    epgSearchPlaceholder: "Rechercher des chaînes...",
    epgLiveLabel: "EN DIRECT",
    epgNoChannels: "Aucune chaîne trouvée dans cette catégorie.",
    epgRecordBtn: "PLANIFIER L'ENREGISTREMENT",
    epgRecordingStarted: "Tâche DVR enregistrée avec succès !",
    epgNoPrograms: "Aucun programme chargé pour cette chaîne.",

    vodHeader: "VIDÉO À LA DEMANDE (VOD)",
    vodSub: "Rendu direct de l'archive de métadonnées indexée à partir des flux connectés",
    vodSearchPlaceholder: "Rechercher des titres VOD...",
    vodLayoutGrid: "Grille",
    vodLayoutShelf: "Étagère Bento",
    vodLayoutEpg: "Détails Étoile",
    vodNoMedia: "Aucun catalogue VOD synchronisé.",
    vodPlayStream: "LANCER LE FILM",
    vodAddedToLib: "Ajouté à l'index de la bibliothèque hors ligne !",

    dvrHeader: "CONTRÔLES DVR",
    dvrSub: "Simulation d'enregistrement de flux asynchrone non bloquant",
    dvrTabSchedule: "ENREGISTREMENTS PLANIFIÉS",
    dvrTabRecordings: "DIFFUSIONS ENREGISTRÉES",
    dvrNoSchedule: "Aucune tâche d'enregistrement planifiée active.",
    dvrNoRecordings: "Aucun enregistrement DVR sur le disque local.",
    dvrPending: "EN ATTENTE",
    dvrRecording: "ENREGISTREMENT EN DIRECT",
    dvrCompleted: "ENREGISTRÉ SUR DISQUE",
    dvrFailed: "ÉCHOUÉ",
    dvrCancelRecording: "ANNULER LA TÂCHE",
    dvrDeleteRecording: "SUPPRIMER LE FICHIER",
    dvrRecordedOn: "Enregistré le",

    vaultHeader: "LOG DE RÉCUPÉRATION DES MÉTADONNÉES",
    vaultSub: "Indexer les dossiers locaux, analyser les expressions régulières et intégrer l'EPG",
    vaultDirectories: "DOSSIERS MÉDIAS SURVEILLÉS",
    vaultAddDirBtn: "SUIVRE LE DOSSIER",
    vaultScanning: "Analyse du système de fichiers...",
    vaultScannedCount: "éléments scannés sécurisés",
    vaultAutoEnrich: "ENRICHISSEMENT AUTOMATIQUE DES MÉTADONNÉES PAR IA",
    vaultCleanTitles: "NETTOYAGE ET FORMATAGE DES TÍTRES DES FILMS",

    setSystemConf: "CONFIGURATION // SYSTÈMES",
    setSystemSub: "Ajustez les signaux numériques, les comptes du portail et les synchronisations",
    setActiveConnections: "CONNEXIONS ACTIVES",
    setLinkFeed: "PORTAIL DE CONNEXION RAPIDE",
    setConnectedPortals: "Aucun portail connecté trouvé",
    setPlaceholderName: "Nom de la connexion (ex. IPTV de Secours)",
    setPlaceholderUrl: "URL du flux M3U...",
    setBtnConnect: "CONNECTER L'INSTANCE",
    setBtnReset: "EFFACER LES DONNÉES LOCALES",
    setMsgLinked: "Playlist liée avec succès !",
    setThemeHeader: "THÈME DE L'INTERFACE",
    setThemeSub: "Modifier l'aura de couleur, la densité d'arrière-plan et le contraste",
    setEpgHeader: "GUIDE EPG ET TIMELINE XMLTV",
    setEpgSub: "Spécifiez l'URL d'un fichier XMLTV externe pour charger le guide",
    setEpgSyncBtn: "SYNCHRONISER LE GUIDE",
    setLanguageLabel: "LANGUE DE L'INTERFACE",
    setLanguageDesc: "Changer la localisation de base pour la distribution Amazon",

    paywallPremiumHeader: "AFTERGLOW PREMIUM",
    paywallTrialEnd: "Votre période d'évaluation gratuite de 15 jours d'Afterglow Receiver est terminée.",
    paywallTrialDaysLeft: "Jours restants dans votre période d'évaluation",
    paywallUpgradeBtn: "DÉVERROUILLER L'ACCÈS COMPLET",
    paywallFeature1: "Décodeur haute vitesse accéléré sans latence",
    paywallFeature2: "Enregistrements 4k simultanés et gestionnaire DVR complet",
    paywallFeature3: "Métadonnées complètes par IA avec Gemini et profils cloud",
    paywallFeaturesHeader: "AVANTAGES INCLUS:"
  },
  de: {
    navLiveTv: "LIVE TV",
    navVod: "VOD KINO",
    navDvr: "DVR AUFNAHME",
    navVault: "METADATEN-TRESOR",
    navSettings: "EINSTELLUNGEN",
    navTrialDays: "VERBLEIBENDE TESTTAGE",
    navTrialExpired: "EVALUIERUNG GERADE ABGELAUFEN",
    navPremiumActive: "PREMIUM SYSTEM AKTIVIERTE",

    setupTitle: "AFTERGLOW TV",
    setupVersion: "EMPFÄNGER V1.4",
    setupSub: "Hochpräziser Multimedia-Empfänger der Profiklasse",
    setupDemoBtn: "MIT DEMO-STREAMS STARTEN",
    setupDemoDesc: "Sofort kinoreife Open-Source-Transmissionsindikatoren vorladen",
    setupLinkHeader: "M3U-PROVIFER STREAM VERKNÜPFEN",
    setupLabelPlaceholder: "Z.B. Globaler Premium-Kanal",
    setupUrlPlaceholder: "Geben Sie die M3U Link-URL des Anbieters ein",
    setupConnectBtn: "DECODER INITIALISIEREN",
    setupOrText: "ODER AUS LOKALEM CACHE STARTEN",
    loadingChannels: "Herunterladen der Streams und Parsen der EPG-Elemente...",

    epgCategoryAll: "Alle",
    epgSearchPlaceholder: "Sender suchen...",
    epgLiveLabel: "LIVE",
    epgNoChannels: "Keine Sender in dieser Kategorie gefunden.",
    epgRecordBtn: "AUFNAHME PLANEN",
    epgRecordingStarted: "Aufnahme-Task erfolgreich registriert!",
    epgNoPrograms: "Keine Programmdaten für diesen Sender vorhanden.",

    vodHeader: "VIDEO-ON-DEMAND (VOD) Kino",
    vodSub: "Direktes Rendering von Metadaten-Archiven aus verbundenen Feeds",
    vodSearchPlaceholder: "Nach Film-Titeln suchen...",
    vodLayoutGrid: "Gitter-Ansicht",
    vodLayoutShelf: "Bento-Regal",
    vodLayoutEpg: "Detail-Tafel",
    vodNoMedia: "Keine VOD-Inhalte synchronisiert.",
    vodPlayStream: "FILM ABSPIELEN",
    vodAddedToLib: "Zum Offline-Bibliotheksindex hinzugefügt!",

    dvrHeader: "DVR CONTROLLER",
    dvrSub: "Simulieren Sie asynchrone Streamaufnahmen mit Offline-Verwaltung",
    dvrTabSchedule: "GEPLANTE AUFNAHMEN",
    dvrTabRecordings: "AUFGENOMMENE SENDUNGEN",
    dvrNoSchedule: "Keine Aufnahmen geplant.",
    dvrNoRecordings: "Keine DVR-Dateien auf der Festplatte vorhanden.",
    dvrPending: "GEPLANT",
    dvrRecording: "NIMMT LIVE AUF",
    dvrCompleted: "AUF DISK GESPEICHERT",
    dvrFailed: "FEHLGESCHLAGEN",
    dvrCancelRecording: "TASK ABBRECHEN",
    dvrDeleteRecording: "DATEI LÖSCHEN",
    dvrRecordedOn: "Aufgenommen am",

    vaultHeader: "METADATEN RECOVERY SERVER",
    vaultSub: "Lokale Medienordner indizieren, Regex parsen und in XMLTV EPG-Guide integrieren",
    vaultDirectories: "ÜBERWACHTE ORDNERPFADE",
    vaultAddDirBtn: "ORDNER VERFOLGEN",
    vaultScanning: "Scanne Ordnerstrukturen...",
    vaultScannedCount: "Einträge gesichtet und verriegelt",
    vaultAutoEnrich: "AUTOMATISCHE METADATEN-AI-ERWEITERUNG",
    vaultCleanTitles: "REGULÄRE FORM ENTSPINNEN",

    setSystemConf: "SYSTEM-KONFIGURATION",
    setSystemSub: "Passen Sie digitale Signale, Schnittstellen und Logs an",
    setActiveConnections: "AKTIVE VERBINDUNGEN",
    setLinkFeed: "SCHNELL-VERKNÜPFUNGSTOOL",
    setConnectedPortals: "Keine Portale verbunden",
    setPlaceholderName: "Verbindungsbezeichnung (z.B. IPTV)",
    setPlaceholderUrl: "M3U Stream-URL...",
    setBtnConnect: "VERBINDUNG STARTEN",
    setBtnReset: "ALLE LOKALEN DATEN LÖSCHEN",
    setMsgLinked: "Playlist erfolgreich verknüpft!",
    setThemeHeader: "OBERFLÄCHEN-DESIGN",
    setThemeSub: "Farbaura, Schärfe, Kontrast und Hintergrundhelligkeit des Receptors wählen",
    setEpgHeader: "EPG & XMLTV ZEITLEISTEN-SPEZIFICATION",
    setEpgSub: "Externe XMLTV-Datei angeben, um Fernsehprogramme zu synchronisieren",
    setEpgSyncBtn: "PROGRAMSDATEN AKTUALISIEREN",
    setLanguageLabel: "INTERFACE-SPRACHE",
    setLanguageDesc: "Lokalisierungseinstellungen für Amazon-Geräte umschalten",

    paywallPremiumHeader: "AFTERGLOW PREMIUM",
    paywallTrialEnd: "Ihre 15-tägige kostenlose Testversion für Afterglow ist abgelaufen.",
    paywallTrialDaysLeft: "Verbleibende Tage der Testphase",
    paywallUpgradeBtn: "UNBEGRENZTEN ZUGANG FREISCHALTEN",
    paywallFeature1: "Verzögerungsfreie, hardwarebeschleunigte Stream-Dekodierung",
    paywallFeature2: "Simultane 4k-Aufnahmefähigkeit und EPG-Planermodul",
    paywallFeature3: "Volle Gemini-AI Filminfos und anpassbare Cloud-Profile",
    paywallFeaturesHeader: "ENTHALTENE VORTEILE:"
  },
  it: {
    navLiveTv: "LIVE TV",
    navVod: "VOD CINEMA",
    navDvr: "REGISTRAZIONE DVR",
    navVault: "TESSERA METADATI",
    navSettings: "IMPOSTAZIONI",
    navTrialDays: "GIORNI DI PROVA RIMANENTI",
    navTrialExpired: "VALUTAZIONE SCADUTA DI RECENTE",
    navPremiumActive: "STAZIONE PREMIUM ATTIVA COMPLETO",

    setupTitle: "AFTERGLOW TV",
    setupVersion: "RICEVITORE V1.4",
    setupSub: "Ricevitore multimediale ad alta fedeltà di livello professionale",
    setupDemoBtn: "AVVIA CON STREAM DI PROVA",
    setupDemoDesc: "Precarica immediatamente canali multimediali open source cinematografici",
    setupLinkHeader: "COLLEGA PROVIDER STREAM M3U",
    setupLabelPlaceholder: "Es. Trasmissione Premium Global",
    setupUrlPlaceholder: "Inserisci l'URL dell'indirizzo M3U",
    setupConnectBtn: "INIZIALIZZA CANALE DECODIFICATORE",
    setupOrText: "OPPURE AVVIA DALLA CACHE LOCALE",
    loadingChannels: "Download e analisi dell'EPG in corso...",

    epgCategoryAll: "Tutti",
    epgSearchPlaceholder: "Cerca canali...",
    epgLiveLabel: "LIVE",
    epgNoChannels: "Nessun canale trovato in questa categoria.",
    epgRecordBtn: "PROGRAMMA REGISTRAZIONE",
    epgRecordingStarted: "Lavoro DVR registrato con successo!",
    epgNoPrograms: "Nessun dato di programmazione disponibile.",

    vodHeader: "VIDEO ON DEMAND (VOD) Cinema",
    vodSub: "Archivio di metadati ad accesso diretto prelevato dai feed collegati",
    vodSearchPlaceholder: "Cerca titoli cinematografici...",
    vodLayoutGrid: "Vista Griglia",
    vodLayoutShelf: "Mensola Bento",
    vodLayoutEpg: "Pannello Dettaglio",
    vodNoMedia: "Nessun catalogo VOD sincronizzato.",
    vodPlayStream: "RIPRODUCI IL FILM",
    vodAddedToLib: "Aggiunto all'indice della libreria locale non in linea!",

    dvrHeader: "CONTROLLER DVR",
    dvrSub: "Simula videoregistrazioni asincrone non bloccanti con memoria di massa offline",
    dvrTabSchedule: "REGISTRAZIONI PIANIFICATE",
    dvrTabRecordings: "TRASMISSIONI ACQUISITE",
    dvrNoSchedule: "Nessuna pianificazione di registrazione attiva.",
    dvrNoRecordings: "Nessun file DVR registrato sui dischi.",
    dvrPending: "IN ATTESA",
    dvrRecording: "IN REGISTRAZIONE AUTOMATICA",
    dvrCompleted: "SALVATO SU DISCO",
    dvrFailed: "FALLITO",
    dvrCancelRecording: "ANNULLA PIANIFICAZIONE",
    dvrDeleteRecording: "ELIMINA FILE DISCO",
    dvrRecordedOn: "Registrato il",

    vaultHeader: "RECOVERI ARCHIVIO METADATI",
    vaultSub: "Scansiona le cartelle di file locali, analizza gli schemi regex e inietta nella guida EPG",
    vaultDirectories: "CARTELLE DI FILE MONITORATE",
    vaultAddDirBtn: "AGGIUNGI CARTELLA",
    vaultScanning: "Scansione del file system...",
    vaultScannedCount: "elementi analizzati e bloccati",
    vaultAutoEnrich: "ARRICCHIMENTO METADATI AI AUTOMATIZZATO",
    vaultCleanTitles: "SCOMPORRE FORMATI INUTILI",

    setSystemConf: "CONFIGURAZIONE DI SISTEMAS",
    setSystemSub: "Regola canali di frequenza, segnali, codec e log delle guide",
    setActiveConnections: "CONNESSIONI ATTIVE",
    setLinkFeed: "STRUMENTO DI CONNESSIONE RAPIDA",
    setConnectedPortals: "Nessun portale di rete connesso",
    setPlaceholderName: "Nome della sorgente (es. Canale Backup)",
    setPlaceholderUrl: "M3U Stream URL...",
    setBtnConnect: "COLLEGA RICEVZIONE",
    setBtnReset: "CANCELLA TUTTI I DATI LOCALI",
    setMsgLinked: "Playlist sincronizzata con successo!",
    setThemeHeader: "STILE DEL RICEVITORE",
    setThemeSub: "Modifica l'aura dei toni al neon, lo sfondo e i contrasti",
    setEpgHeader: "SPECIFICHE GUIDE XMLTV",
    setEpgSub: "Inserisci l'indirizzo XMLTV esterno per mappare la griglia dei programmi",
    setEpgSyncBtn: "SINCRONIZZA GUIDA PROGRAMMI",
    setLanguageLabel: "LINGUA INTERFACCIA",
    setLanguageDesc: "Modifica le impostazioni di lingua per la distribuzione Amazon",

    paywallPremiumHeader: "AFTERGLOW PREMIUM",
    paywallTrialEnd: "Il periodo di prova gratuita di 15 giorni per il ricevitore Afterglow è terminato.",
    paywallTrialDaysLeft: "Giorni rimanenti per il test di valutazione",
    paywallUpgradeBtn: "SBLOCCA ACCESSO ILLIMITATO",
    paywallFeature1: "Decodifica del flusso accelerata hardware costante e fluida",
    paywallFeature2: "Registrazione simultanea in 4k e pianificatore DVR di rete",
    paywallFeature3: "Metadati di film completi guidati dall'IA Gemini e profili sincronizzati",
    paywallFeaturesHeader: "VANTAGGI COMPRESI:"
  },
  pt: {
    navLiveTv: "TV EM DIRECTO",
    navVod: "CINEMA VOD",
    navDvr: "GRAVAÇÃO DVR",
    navVault: "PAINEL DE METADADOS",
    navSettings: "AJUSTES",
    navTrialDays: "DIAS DE TESTE RESTANTES",
    navTrialExpired: "AVALIAÇÃO ACABOU DE EXPIRAR",
    navPremiumActive: "SISTEMA PREMIUM ATIVADO",

    setupTitle: "AFTERGLOW TV",
    setupVersion: "RECEPTOR V1.4",
    setupSub: "Recetor multimédia de alta fidelidade de classe de estação",
    setupDemoBtn: "INICIAR COM CANAIS DE DEMONSTRAÇÃO",
    setupDemoDesc: "Carrega imediatamente streams cinematográficos de código aberto",
    setupLinkHeader: "VINCULAR PORTAL DO PROVEDOR M3U",
    setupLabelPlaceholder: "Ex: Canal Premium Global",
    setupUrlPlaceholder: "Digite a URL da lista M3U",
    setupConnectBtn: "INICIALIZAR CANAL DECODIFICADOR",
    setupOrText: "OU CARREGAR DO CACHE LINGUÍSTICO",
    loadingChannels: "Efetuando o download das transmissões e canais do EPG...",

    epgCategoryAll: "Tudo",
    epgSearchPlaceholder: "Pesquisar canais...",
    epgLiveLabel: "REPRODUZINDO LIVE",
    epgNoChannels: "Nenhum canal encontrado nesta categoria.",
    epgRecordBtn: "PROGRAMAR CONTATO DVR",
    epgRecordingStarted: "Pedido do agendamento gravado no sistema!",
    epgNoPrograms: "Dados de programação não disponíveis para este canal.",

    vodHeader: "VIDEO ON DEMAND (VOD) Cinema",
    vodSub: "Renderização direta do arquivo de metadados extraídos de redes sincronizadas",
    vodSearchPlaceholder: "Buscar títulos de VOD...",
    vodLayoutGrid: "Grade de Exibição",
    vodLayoutShelf: "Estante Bento",
    vodLayoutEpg: "Painel Informativo",
    vodNoMedia: "Nenhum catálogo VOD sincronizado.",
    vodPlayStream: "ASSISTIR AO FILME",
    vodAddedToLib: "Salvo no banco de dados local off-line!",

    dvrHeader: "PAINEL DE GRAVAÇÕES DVR",
    dvrSub: "Simule captura de fluxos as síncronas sem interrupções com arquivos gravados localmente",
    dvrTabSchedule: "CAPTURE AGENDADOS",
    dvrTabRecordings: "TRANSMISSÕES CAPTURADAS",
    dvrNoSchedule: "Não há gravações programadas no momento.",
    dvrNoRecordings: "Nenhum arquivo gravado no disco rígido.",
    dvrPending: "PENDENTE",
    dvrRecording: "GRAVANDO LIVE",
    dvrCompleted: "SALVO EM DISCO",
    dvrFailed: "FALHOU",
    dvrCancelRecording: "CANCELAR TAREFA",
    dvrDeleteRecording: "APAGAR ARQUIVO",
    dvrRecordedOn: "Gravado em",

    vaultHeader: "NÚCLEO DE METADADOS",
    vaultSub: "Indexar pastas locais, analisar tags regex e injetar no guia do timeline EPG",
    vaultDirectories: "PASTAS MONITORADAS",
    vaultAddDirBtn: "RASTREAR DIRETÓRIO",
    vaultScanning: "Scaneando sistemas de arquivos...",
    vaultScannedCount: "diretórios de arquivos mapeados e bloqueados",
    vaultAutoEnrich: "ENRIQUECIMENTO AUTOMÁTICO DE DADOS VIA IA",
    vaultCleanTitles: "LIMPAR DETALHES GERAIS DOS TÍTULOS",

    setSystemConf: "CONFIGURAÇÃO GERAL",
    setSystemSub: "Ajustar entradas, servidores, codecs e bancos de dados locais",
    setActiveConnections: "CONEXÕES ATIVAS",
    setLinkFeed: "PORTAL DE CONEXÃO RÁPIDA",
    setConnectedPortals: "Nenhum portal de IPTV conectado",
    setPlaceholderName: "Nome da conexão (ex: Lista Premium)",
    setPlaceholderUrl: "M3U Stream URL...",
    setBtnConnect: "CONECTAR RECEPTOR",
    setBtnReset: "ZERAR BASE DE DADOS",
    setMsgLinked: "Lista de reprodução sincronizada com sucesso!",
    setThemeHeader: "TEMA DA INTERFADE",
    setThemeSub: "Modificar halos neon de cores, gradientes e contrastes de exibição",
    setEpgHeader: "GUIA DE PROGRAMAÇÃO XMLTV E EPG",
    setEpgSub: "Mapear URL externo de XMLTV para acoplar dados de canal de grade",
    setEpgSyncBtn: "SINCRONIZAR PROGRAMAÇÃO",
    setLanguageLabel: "IDIOMA DO MANUAL INTERATIVO",
    setLanguageDesc: "Altere os modos linguísticos para a loja de distribuição Amazon",

    paywallPremiumHeader: "AFTERGLOW PREMIUM",
    paywallTrialEnd: "Sua licença de teste gratuito de 15 dias do receptor Afterglow expirou.",
    paywallTrialDaysLeft: "Dias para avaliação de teste",
    paywallUpgradeBtn: "LIBERAR VERSÃO COMPLETA",
    paywallFeature1: "Decodificador rápido de alta velocidade sem limitações de hardware",
    paywallFeature2: "Gravação simultânea em 4k e gerenciador DVR inteligente offline",
    paywallFeature3: "Ficha técnica de cinema completa via IA Gemini e perfis sincronizados",
    paywallFeaturesHeader: "ENTREGA DE BENEFÍCIOS:"
  },
  ja: {
    navLiveTv: "ライブテレビ",
    navVod: "VODシネマ",
    navDvr: "DVR録画キャプチャ",
    navVault: "メタデータ保管庫",
    navSettings: "システム設定",
    navTrialDays: "体験試用期間の残り日数",
    navTrialExpired: "試用期間が終了しました",
    navPremiumActive: "プレミアム機能有効化中",

    setupTitle: "AFTERGLOW TV",
    setupVersion: "レシーバー V1.4",
    setupSub: "高忠実度・放送局クラスのIPTVマルチメディア受信機",
    setupDemoBtn: "デモ用配信ソースで起動する",
    setupDemoDesc: "オープンソースの様々な高画質試験配信を即座にプリロードして開始",
    setupLinkHeader: "プロバイダポータル（M3U）接続設定",
    setupLabelPlaceholder: "例: グローバルプレミアム配信",
    setupUrlPlaceholder: "接続用M3UファイルのURLリンクを入力...",
    setupConnectBtn: "デコーダーチャンネル初期化実行",
    setupOrText: "または ローカルキャッシュから起動する",
    loadingChannels: "チャンネル一覧とEPG番組表パーツをダウンロードして解析中...",

    epgCategoryAll: "すべて",
    epgSearchPlaceholder: "チャンネルを検索...",
    epgLiveLabel: "放送中",
    epgNoChannels: "現在のカテゴリに該当するチャンネルがありませんでした。",
    epgRecordBtn: "録画スケジュール予約",
    epgRecordingStarted: "DVRキャプチャ予約が登録されました！",
    epgNoPrograms: "このチャンネルの番組スケジュール表はありません。",

    vodHeader: "ビデオ・オン・デマンド (VOD) 映画館",
    vodSub: "接続されたプレイリストから直接メタデータを自動抽出し構築した映画館",
    vodSearchPlaceholder: "VODタイトルを検索...",
    vodLayoutGrid: "グリッド表示",
    vodLayoutShelf: "弁当BOXシェルフ",
    vodLayoutEpg: "詳細カード",
    vodNoMedia: "VODカタログがありません。",
    vodPlayStream: "本編映画を再生",
    vodAddedToLib: "ローカルアーカイブの索引に追加されました！",

    dvrHeader: "DVR録画管理システム",
    dvrSub: "バックグラウンドで非同期に動画を取得し、ローカルに録画保存するシミュレータ",
    dvrTabSchedule: "キャプチャ予約一覧",
    dvrTabRecordings: "録画作成済みライブラリ",
    dvrNoSchedule: "アクティブな録画予約タスクはありません。",
    dvrNoRecordings: "ローカルディスクに保存されたDVR動画はありません。",
    dvrPending: "予約中",
    dvrRecording: "本番取得進行中",
    dvrCompleted: "ディスク保存完了",
    dvrFailed: "エラー失敗",
    dvrCancelRecording: "予約タスク解除",
    dvrDeleteRecording: "ファイルを削除",
    dvrRecordedOn: "録画日時:",

    vaultHeader: "メタデータ自動回収ドメイン",
    vaultSub: "ローカルディレクトリから動画ファイルを拾い集め、EPGなどの番組表に組み込む",
    vaultDirectories: "監視対象フォルダ一覧",
    vaultAddDirBtn: "対象フォルダを追跡する",
    vaultScanning: "ファイル格納領域を分析中...",
    vaultScannedCount: "点のスキャン情報をロック完了しました",
    vaultAutoEnrich: "AIを駆使した自動番組詳細メタデータ付与（GEMINI連携）",
    vaultCleanTitles: "不純なタイトル表示のクリーンアップ整形",

    setSystemConf: "受信システム管理構成パネル",
    setSystemSub: "ストリーム信号調整、インポート情報、番組ガイドの同期",
    setActiveConnections: "有効な接続",
    setLinkFeed: "簡易配信追加ツール",
    setConnectedPortals: "リンクされているIPTVプレイリストはありません",
    setPlaceholderName: "接続先の名前 (例: バックアップ回線)",
    setPlaceholderUrl: "M3U Stream URLを入力...",
    setBtnConnect: "レシーバー回線投入",
    setBtnReset: "ローカルデータを初期状態に全削除",
    setMsgLinked: "プレイリストの紐付けに成功しました！",
    setThemeHeader: "カラーテーマ切替構成",
    setThemeSub: "ネオンオーラ効果、密度のコントロール、配色および高コントラストモード",
    setEpgHeader: "EPGおよびXMLTVタイムライン仕様",
    setEpgSub: "外部XMLTVアドレスを入力して、チャンネルの番組データを同期します",
    setEpgSyncBtn: "番組表データを手動同期する",
    setLanguageLabel: "システム言語 (Amazon Appstore用)",
    setLanguageDesc: "Amazon Appstoreでの審査配布に準じたローカライズ言語の切替",

    paywallPremiumHeader: "AFTERGLOW PREMIUM プレミアム",
    paywallTrialEnd: "Afterglowレシーバーの15日間の無料体験評価期間が満了しました。",
    paywallTrialDaysLeft: "体験無料評価期間の残り日数",
    paywallUpgradeBtn: "制限なしフルアクセスを即時開放",
    paywallFeature1: "映像の引っ掛かりを排除する高ビットレートハードウェアアクセラレーション",
    paywallFeature2: "複数番組の同時4kバックグラウンドDVR録画機能",
    paywallFeature3: "Geminiを駆使したシネマ検索＆カスタムマルチプロフィール設定",
    paywallFeaturesHeader: "得られる追加権限メニュー:"
  }
};

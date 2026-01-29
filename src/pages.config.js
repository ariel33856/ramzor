/**
 * pages.config.js - Page routing configuration
 * 
 * This file is AUTO-GENERATED. Do not add imports or modify PAGES manually.
 * Pages are auto-registered when you create files in the ./pages/ folder.
 * 
 * THE ONLY EDITABLE VALUE: mainPage
 * This controls which page is the landing page (shown when users visit the app).
 * 
 * Example file structure:
 * 
 *   import HomePage from './pages/HomePage';
 *   import Dashboard from './pages/Dashboard';
 *   import Settings from './pages/Settings';
 *   
 *   export const PAGES = {
 *       "HomePage": HomePage,
 *       "Dashboard": Dashboard,
 *       "Settings": Settings,
 *   }
 *   
 *   export const pagesConfig = {
 *       mainPage: "HomePage",
 *       Pages: PAGES,
 *   };
 * 
 * Example with Layout (wraps all pages):
 *
 *   import Home from './pages/Home';
 *   import Settings from './pages/Settings';
 *   import __Layout from './Layout.jsx';
 *
 *   export const PAGES = {
 *       "Home": Home,
 *       "Settings": Settings,
 *   }
 *
 *   export const pagesConfig = {
 *       mainPage: "Home",
 *       Pages: PAGES,
 *       Layout: __Layout,
 *   };
 *
 * To change the main page from HomePage to Dashboard, use find_replace:
 *   Old: mainPage: "HomePage",
 *   New: mainPage: "Dashboard",
 *
 * The mainPage value must match a key in the PAGES object exactly.
 */
import AIBot from './pages/AIBot';
import AccountsArchive from './pages/AccountsArchive';
import AllDashboards from './pages/AllDashboards';
import ArchiveAccounts from './pages/ArchiveAccounts';
import ArchiveCaseDetails from './pages/ArchiveCaseDetails';
import Boards from './pages/Boards';
import CalendarPage from './pages/CalendarPage';
import CaseAccount from './pages/CaseAccount';
import CaseCalculator from './pages/CaseCalculator';
import CaseCalendar from './pages/CaseCalendar';
import CaseContact from './pages/CaseContact';
import CaseContacts from './pages/CaseContacts';
import CaseDashboards from './pages/CaseDashboards';
import CaseData from './pages/CaseData';
import CaseDetails from './pages/CaseDetails';
import CaseDocuments from './pages/CaseDocuments';
import CaseInsurance from './pages/CaseInsurance';
import CaseMetrics from './pages/CaseMetrics';
import CaseNotes from './pages/CaseNotes';
import CasePayments from './pages/CasePayments';
import CasePersonal from './pages/CasePersonal';
import CaseProducts from './pages/CaseProducts';
import CaseProfiles from './pages/CaseProfiles';
import CaseStatus from './pages/CaseStatus';
import CaseSummary from './pages/CaseSummary';
import CaseTracking from './pages/CaseTracking';
import CaseWorkflow from './pages/CaseWorkflow';
import ClientPortal from './pages/ClientPortal';
import Communication from './pages/Communication';
import ContactsArchive from './pages/ContactsArchive';
import Dashboard from './pages/Dashboard';
import ERP from './pages/ERP';
import Management from './pages/Management';
import ManagementHub from './pages/ManagementHub';
import Marketing from './pages/Marketing';
import ModuleArchive from './pages/ModuleArchive';
import ModuleCaseDetails from './pages/ModuleCaseDetails';
import ModuleView from './pages/ModuleView';
import ModulesManager from './pages/ModulesManager';
import NewCase from './pages/NewCase';
import NewContact from './pages/NewContact';
import Notifications from './pages/Notifications';
import PersonDetails from './pages/PersonDetails';
import Products from './pages/Products';
import Sales from './pages/Sales';
import SearchPage from './pages/SearchPage';
import __Layout from './Layout.jsx';


export const PAGES = {
    "AIBot": AIBot,
    "AccountsArchive": AccountsArchive,
    "AllDashboards": AllDashboards,
    "ArchiveAccounts": ArchiveAccounts,
    "ArchiveCaseDetails": ArchiveCaseDetails,
    "Boards": Boards,
    "CalendarPage": CalendarPage,
    "CaseAccount": CaseAccount,
    "CaseCalculator": CaseCalculator,
    "CaseCalendar": CaseCalendar,
    "CaseContact": CaseContact,
    "CaseContacts": CaseContacts,
    "CaseDashboards": CaseDashboards,
    "CaseData": CaseData,
    "CaseDetails": CaseDetails,
    "CaseDocuments": CaseDocuments,
    "CaseInsurance": CaseInsurance,
    "CaseMetrics": CaseMetrics,
    "CaseNotes": CaseNotes,
    "CasePayments": CasePayments,
    "CasePersonal": CasePersonal,
    "CaseProducts": CaseProducts,
    "CaseProfiles": CaseProfiles,
    "CaseStatus": CaseStatus,
    "CaseSummary": CaseSummary,
    "CaseTracking": CaseTracking,
    "CaseWorkflow": CaseWorkflow,
    "ClientPortal": ClientPortal,
    "Communication": Communication,
    "ContactsArchive": ContactsArchive,
    "Dashboard": Dashboard,
    "ERP": ERP,
    "Management": Management,
    "ManagementHub": ManagementHub,
    "Marketing": Marketing,
    "ModuleArchive": ModuleArchive,
    "ModuleCaseDetails": ModuleCaseDetails,
    "ModuleView": ModuleView,
    "ModulesManager": ModulesManager,
    "NewCase": NewCase,
    "NewContact": NewContact,
    "Notifications": Notifications,
    "PersonDetails": PersonDetails,
    "Products": Products,
    "Sales": Sales,
    "SearchPage": SearchPage,
}

export const pagesConfig = {
    mainPage: "Dashboard",
    Pages: PAGES,
    Layout: __Layout,
};
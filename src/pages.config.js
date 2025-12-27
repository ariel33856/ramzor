import Dashboard from './pages/Dashboard';
import NewCase from './pages/NewCase';
import CaseDetails from './pages/CaseDetails';
import ClientPortal from './pages/ClientPortal';
import Management from './pages/Management';
import AllDashboards from './pages/AllDashboards';
import Marketing from './pages/Marketing';
import Sales from './pages/Sales';
import Boards from './pages/Boards';
import Products from './pages/Products';
import ERP from './pages/ERP';
import SearchPage from './pages/SearchPage';
import AIBot from './pages/AIBot';
import Notifications from './pages/Notifications';
import CalendarPage from './pages/CalendarPage';
import Communication from './pages/Communication';
import __Layout from './Layout.jsx';


export const PAGES = {
    "Dashboard": Dashboard,
    "NewCase": NewCase,
    "CaseDetails": CaseDetails,
    "ClientPortal": ClientPortal,
    "Management": Management,
    "AllDashboards": AllDashboards,
    "Marketing": Marketing,
    "Sales": Sales,
    "Boards": Boards,
    "Products": Products,
    "ERP": ERP,
    "SearchPage": SearchPage,
    "AIBot": AIBot,
    "Notifications": Notifications,
    "CalendarPage": CalendarPage,
    "Communication": Communication,
}

export const pagesConfig = {
    mainPage: "Dashboard",
    Pages: PAGES,
    Layout: __Layout,
};
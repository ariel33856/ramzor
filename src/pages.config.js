import Dashboard from './pages/Dashboard';
import NewCase from './pages/NewCase';
import CaseDetails from './pages/CaseDetails';
import ClientPortal from './pages/ClientPortal';
import Management from './pages/Management';
import AllDashboards from './pages/AllDashboards';
import __Layout from './Layout.jsx';


export const PAGES = {
    "Dashboard": Dashboard,
    "NewCase": NewCase,
    "CaseDetails": CaseDetails,
    "ClientPortal": ClientPortal,
    "Management": Management,
    "AllDashboards": AllDashboards,
}

export const pagesConfig = {
    mainPage: "Dashboard",
    Pages: PAGES,
    Layout: __Layout,
};
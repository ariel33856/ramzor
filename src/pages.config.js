import Dashboard from './pages/Dashboard';
import NewCase from './pages/NewCase';
import CaseDetails from './pages/CaseDetails';
import ClientPortal from './pages/ClientPortal';


export const PAGES = {
    "Dashboard": Dashboard,
    "NewCase": NewCase,
    "CaseDetails": CaseDetails,
    "ClientPortal": ClientPortal,
}

export const pagesConfig = {
    mainPage: "Dashboard",
    Pages: PAGES,
};
// רשימת השדות המשותפת לטבלת חשבונות ולכרטיס לווה
export const borrowerFields = [
  { id: 'account_number', label: 'מספר חשבון', visible: true },
  { id: 'client_name', label: 'שם פרטי', visible: true },
  { id: 'last_name', label: 'שם משפחה', visible: false },
  { id: 'borrower_id', label: 'תעודת זהות', visible: true },
  { id: 'borrower_phone', label: 'טלפון', visible: true },
  { id: 'borrower_email', label: 'אימייל', visible: true }
];
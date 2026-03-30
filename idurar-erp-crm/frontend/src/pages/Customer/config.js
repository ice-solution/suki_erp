export const fields = {
  accountCode: {
    type: 'string',
    label: 'Account Code',
  },
  name: {
    type: 'string',
  },
  country: {
    type: 'country',
    // color: 'red',
  },
  address: {
    type: 'string',
  },
  phone: {
    type: 'phone',
  },
  email: {
    type: 'email',
  },
  contacts: {
    type: 'contactList',
    label: 'contact_list',
  },
};

import * as actionTypes from './types';

const INITIAL_KEY_STATE = {
  result: null,
  current: null,
  isLoading: false,
  isSuccess: false,
};

const INITIAL_STATE = {
  current: {
    result: null,
  },
  list: {},
  create: INITIAL_KEY_STATE,
  update: INITIAL_KEY_STATE,
  delete: INITIAL_KEY_STATE,
  read: INITIAL_KEY_STATE,
  search: { ...INITIAL_KEY_STATE, result: [] },
};

// 獲取或初始化 entity 的 list state
const getEntityListState = (state, entity) => {
  if (!state.list[entity]) {
    return {
      result: {
        items: [],
        pagination: {
          current: 1,
          pageSize: 10,
          total: 1,
          showSizeChanger: false,
        },
      },
      isLoading: false,
      isSuccess: false,
    };
  }
  return state.list[entity];
};

const crudReducer = (state = INITIAL_STATE, action) => {
  const { payload, keyState, entity } = action;
  switch (action.type) {
    case actionTypes.RESET_STATE:
      // 保留按 entity 分離的 list state，只重置其他狀態
      return {
        ...INITIAL_STATE,
        list: state.list || {}, // 保留現有的 list state
      };
    case actionTypes.CURRENT_ITEM:
      return {
        ...state,
        current: {
          result: payload,
        },
      };
    case actionTypes.REQUEST_LOADING:
      // 如果是 list，需要按 entity 分離
      if (keyState === 'list' && entity) {
        return {
          ...state,
          list: {
            ...state.list,
            [entity]: {
              ...getEntityListState(state, entity),
              isLoading: true,
            },
          },
        };
      }
      return {
        ...state,
        [keyState]: {
          ...state[keyState],
          isLoading: true,
        },
      };
    case actionTypes.REQUEST_FAILED:
      // 如果是 list，需要按 entity 分離
      if (keyState === 'list' && entity) {
        return {
          ...state,
          list: {
            ...state.list,
            [entity]: {
              ...getEntityListState(state, entity),
              isLoading: false,
              isSuccess: false,
            },
          },
        };
      }
      return {
        ...state,
        [keyState]: {
          ...state[keyState],
          isLoading: false,
          isSuccess: false,
        },
      };
    case actionTypes.REQUEST_SUCCESS:
      // 如果是 list，需要按 entity 分離
      if (keyState === 'list' && entity) {
        return {
          ...state,
          list: {
            ...state.list,
            [entity]: {
              result: payload,
              isLoading: false,
              isSuccess: true,
            },
          },
        };
      }
      return {
        ...state,
        [keyState]: {
          result: payload,
          isLoading: false,
          isSuccess: true,
        },
      };
    case actionTypes.CURRENT_ACTION:
      return {
        ...state,
        [keyState]: {
          ...INITIAL_KEY_STATE,
          current: payload,
        },
      };
    case actionTypes.RESET_ACTION:
      // 如果是 list，需要按 entity 分離
      if (keyState === 'list' && entity) {
        return {
          ...state,
          list: {
            ...state.list,
            [entity]: {
              result: {
                items: [],
                pagination: {
                  current: 1,
                  pageSize: 10,
                  total: 1,
                  showSizeChanger: false,
                },
              },
              isLoading: false,
              isSuccess: false,
            },
          },
        };
      }
      return {
        ...state,
        [keyState]: {
          ...(INITIAL_STATE[keyState] || INITIAL_KEY_STATE),
        },
      };
    default:
      return state;
  }
};

export default crudReducer;

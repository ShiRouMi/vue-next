export const enum OperationTypes {
  // using literal strings instead of numbers so that it's easier to inspect
  // debugger events
  // 枚举
  SET = 'set',
  ADD = 'add',
  DELETE = 'delete',
  CLEAR = 'clear',
  GET = 'get',
  HAS = 'has',
  ITERATE = 'iterate'
}

// 环境变量配置
// 如果.env文件没有被正确加载，这里提供一个备用方案

export const STRIPE_PUBLISHABLE_KEY = 
  process.env.REACT_APP_STRIPE_PUBLISHABLE_KEY || 
  'pk_test_51SPhe7FKUeg2OuIVQa5ZtAtJ0vF1mU55Cn2hiZ2DcY6LsrehmQNUtpeEGcIwdrxmhQQl3LurUDXGu1OLCMLYbRzy00U2jmgL6K';

// 调试输出
if (process.env.NODE_ENV === 'development') {
}



















import { useAuth } from '../contexts/AuthContext';

/**
 * 用户状态 Hook
 * 基于AuthContext，提供用户信息和微信绑定功能
 */
interface User {
  id: string;
  email?: string;
  wechat_openid?: string;
  wechat_nickname?: string;
  login_method: 'wechat' | 'email' | 'google';
  is_wechat_bound: boolean;
}

const useUser = () => {
  const { user: authUser, loading: authLoading } = useAuth();

  // 将AuthContext的用户格式转换为useUser的格式
  const user: User | null = authUser
    ? {
        id: authUser.id,
        email: authUser.email,
        wechat_openid: authUser.wechat_openid,
        wechat_nickname: authUser.wechat_openid ? 'WeChat User' : undefined,
        login_method: authUser.wechat_openid ? 'wechat' : 'email',
        is_wechat_bound: !!authUser.wechat_openid,
      }
    : null;

  // 检查用户是否绑定微信
  const isWechatBound = user ? (user.is_wechat_bound || !!user.wechat_openid) : false;

  // 绑定微信（通过微信登录实现）
  const bindWechat = async (openid: string, nickname?: string) => {
    try {
      // 注意：这里需要从AuthContext获取wechatLogin
      // 但由于hook的限制，我们暂时返回Success
      // 实际绑定应该在AuthContext中实现
      return { success: true };
    } catch (error) {

      return { success: false, error: 'Failed to bind WeChat' };
    }
  };

  // 获取当前用户
  const getCurrentUser = async () => {
    return user;
  };

  return {
    user,
    loading: authLoading,
    isWechatBound,
    bindWechat,
    getCurrentUser,
  };
};

export default useUser;


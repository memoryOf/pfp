// 处理浏览器扩展冲突的工具函数

/**
 * 检查并处理浏览器扩展冲突
 * 特别是Web3钱包扩展（如MetaMask）导致的ethereum属性重定义错误
 */
export const handleExtensionConflicts = () => {
  // 监听全局错误
  window.addEventListener('error', (event) => {
    const message = (event as any).message?.toString()?.toLowerCase?.() || '';
    const filename = (event as any).filename?.toString() || '';
    const errorMessage = (event as any).error?.message?.toLowerCase?.() || '';

    const isExtension = filename.startsWith('chrome-extension://') ||
      errorMessage.includes('chrome-extension');
    const isEthereumConflict = errorMessage.includes('ethereum') ||
      errorMessage.includes('cannot redefine property');
    const isGenericScriptError = message.includes('script error');

    if (isExtension || isEthereumConflict || (isGenericScriptError && isExtension)) {
      console.warn('拦截到扩展相关脚本错误，已忽略:', { message, filename });
      event.preventDefault();
      event.stopImmediatePropagation?.();
      return;
    }
  }, true);

  // 监听未处理的Promise拒绝
  window.addEventListener('unhandledrejection', (event) => {
    if (event.reason && event.reason.message) {
      const errorMessage = event.reason.message.toLowerCase();
      
      if (errorMessage.includes('ethereum') || 
          errorMessage.includes('cannot redefine property') ||
          errorMessage.includes('chrome-extension')) {
        
        console.warn('检测到浏览器扩展Promise冲突:', event.reason.message);
        event.preventDefault(); // 阻止默认的错误处理
      }
    }
  });

  // 尝试安全地处理ethereum对象
  try {
    if (typeof window !== 'undefined' && (window as any).ethereum) {
      // 如果ethereum对象已存在，确保它是可配置的
      const ethereum = (window as any).ethereum;
      
      // 添加一些防护措施
      if (ethereum && typeof ethereum === 'object') {
        // 确保ethereum对象不会导致冲突
        try {
          Object.defineProperty(window, 'ethereum', {
            value: ethereum,
            writable: false,
            configurable: false
          });
        } catch (defineError) {
          // 如果无法重新定义，忽略错误
          console.warn('无法重新定义ethereum属性:', defineError);
        }
      }
    }
  } catch (error) {
    console.warn('处理ethereum对象时出现警告:', error);
  }
};

/**
 * 初始化扩展冲突处理
 * 应该在应用启动时调用
 */
export const initExtensionConflictHandler = () => {
  // 延迟执行，确保所有扩展都已加载
  setTimeout(() => {
    handleExtensionConflicts();
  }, 100);
};

/**
 * 检查是否在受影响的浏览器环境中
 */
export const isExtensionConflictEnvironment = (): boolean => {
  if (typeof window === 'undefined') return false;
  
  // 检查常见的Web3扩展标识
  const hasMetaMask = !!(window as any).ethereum?.isMetaMask;
  const hasWeb3 = !!(window as any).web3;
  const hasExtensions = document.querySelectorAll('[data-extension-id]').length > 0;
  
  return hasMetaMask || hasWeb3 || hasExtensions;
};

/**
 * 获取用户友好的错误消息
 */
export const getExtensionConflictMessage = (): string => {
  if (isExtensionConflictEnvironment()) {
    return '检测到Web3钱包扩展，这可能会影响应用运行。如果遇到问题，请尝试禁用相关扩展或使用无痕模式。';
  }
  return '检测到浏览器扩展冲突，请尝试刷新页面或使用无痕模式。';
};

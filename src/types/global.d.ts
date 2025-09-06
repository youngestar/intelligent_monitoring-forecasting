// 全局类型定义文件
declare global {
  interface Window {
    AMap: any; // 使用any类型避免重复声明冲突
    tempMarker: any;
    removeMarker?: (id: string) => void;
    _AMapSecurityConfig?: {
      securityJsCode: string;
    };
  }
  
  // 定义AMapInstance类型
  type AMapInstance = any;
}

export {}; // 确保这个文件被视为模块
import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { Toaster } from "react-hot-toast";
import { SWRConfig } from "swr";

const inter = Inter({ subsets: ["latin"], variable: "--font-inter" });

export const metadata: Metadata = {
  title: "FiinQuant — AI Financial Intelligence Platform",
  description: "Nền tảng phân tích chứng khoán Việt Nam với AI và XAI",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="vi" className={inter.variable}>
      <body>
        <SWRConfig
          value={{
            dedupingInterval: 60_000,     // cache kết quả 60s, không fetch lại khi chuyển trang
            revalidateOnFocus: false,      // không fetch lại khi focus tab
            revalidateOnReconnect: false,  // không fetch lại khi reconnect
            shouldRetryOnError: false,     // không retry khi lỗi để tránh chờ lâu
            errorRetryCount: 1,
          }}
        >
          <Toaster
            position="top-right"
            toastOptions={{
              style: {
                background: "#1a1f2e",
                color: "#e2e8f0",
                border: "1px solid rgba(99,179,237,0.2)",
              },
            }}
          />
          {children}
        </SWRConfig>
      </body>
    </html>
  );
}


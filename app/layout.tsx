import type {Metadata} from "next";import "./globals.css";
export const metadata:Metadata={title:"Acosta One | Retail Media Intelligence",description:"Campaign creation, account auditing and media planning in one Acosta workspace.",icons:{icon:"/favicon.svg"}};
export default function Layout({children}:{children:React.ReactNode}){return <html lang="en"><body>{children}</body></html>}

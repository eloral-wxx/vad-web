import { connection } from "next/server"
import DemoClient from "./DemoClient"

export default async function Page() {
  await connection()
  return <DemoClient />
}

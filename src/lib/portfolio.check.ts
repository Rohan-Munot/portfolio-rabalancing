import { selfCheck } from "./portfolio"

const errors = selfCheck()
if (errors.length > 0) {
  console.error(errors.join("\n"))
  process.exit(1)
}
console.log("portfolio math ok")

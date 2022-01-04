import sdk from "./1-initialize-sdk.js";
import { readFileSync } from "fs";

const bundleDrop = sdk.getBundleDropModule(
  "0x72a8d9178F94dD13eAa73B7fD44334A2a174AdEe",
);

(async () => {
  try {
    await bundleDrop.createBatch([
      {
        name: "Soleil",
        description: "This NFT will give you access to GalacticDAO!",
        image: readFileSync("scripts/assets/soleil.png"),
      },
    ]);
    console.log("✅ Successfully created a new NFT in the drop!");
  } catch (error) {
    console.error("failed to create the new NFT", error);
  }
})()

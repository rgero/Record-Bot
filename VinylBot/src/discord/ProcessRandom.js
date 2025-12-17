import { getRandomRow } from "../google/GetRandomRow.js";

export const ProcessRandom = async (message) => {
    const args = message.content.split(" ").slice(1);
    const param = args[0]?.toLowerCase();

    try {
      let row;
      let sheetType = "vinyl";

      // !random store
      if (param === "store") {
        sheetType = "store"
        row = await getRandomRow({
          sheetName: "Location Info",
        });

      // !random <name>
      } else if (param) {
        row = await getRandomRow({
          sheetName: "Vinyls",
          filterColumnIndex: 9, // Column J (0-based index)
          filterValue: param,
        });

      // !random (no param)
      } else {
        row = await getRandomRow({
          sheetName: "Vinyls",
        });
      }

      if (!row) {
        message.reply("❌ No matching entries found.");
        return;
      }

      let description;
      if (sheetType === "store") {
        description = `${row[0]}\n${row[1]}`;
      } else {
        description = `🎵 **${row[0]}**\n💿 *${row[1]}*`;
      }

      message.reply({
        embeds: [
          {
            title: "🎲 Random Pick",
            description,
            color: 0x5865f2,
          },
        ],
      });

    } catch (err) {
      console.error(err);
      message.reply("❌ Failed to fetch random entry.");
    }
}
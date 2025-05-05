import cron from "node-cron";
import db from "../models/index.js";
import { Op } from "sequelize";
import dayjs from "dayjs";

export function scheduleBatchExpiryCheck() {
  // Chạy mỗi ngày lúc 00:00
  cron.schedule(
    "0 0 * * *",
    async () => {
      try {
        const { Op } = db.Sequelize;
        const [updatedCount] = await db.Batch.update(
          { status: "Expired" },
          {
            where: {
              expiry_date: { [Op.lt]: new Date() },
              status: "Active",
            },
          }
        );
        console.log(
          `[Batch Expiry] Đã chuyển ${updatedCount} lô thuốc từ 'Active' sang 'Expired'`
        );
      } catch (err) {
        console.error("[Batch Expiry] Lỗi khi cập nhật hết hạn:", err);
      }
    },
    {
      timezone: "Asia/Ho_Chi_Minh",
    }
  );
}

export async function expireOldPrescriptions() {
  const oneWeekAgo = dayjs().subtract(7, "day").toDate();

  const [updatedCount] = await db.Prescription.update(
    { status: "cancelled" },
    {
      where: {
        status: "pending_prepare",
        createdAt: { [Op.lt]: oneWeekAgo },
      },
    }
  );

  console.log(
    `[Scheduler] Đã huỷ ${updatedCount} đơn thuốc (đã active > 1 tuần)`
  );
}

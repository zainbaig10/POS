import expressRouter from "express";
import userRouter from "./userRoutes.js";
import productRouter from "./productRoutes.js";
import saleRouter from "./saleRoutes.js";
import invoiceRouter from "./invoiceRoutes.js";
import settingsRouter from "./settingsRoutes.js";

const router = expressRouter();

router.use("/user", userRouter);
router.use("/product", productRouter);
router.use("/sale", saleRouter);
router.use("/invoice", invoiceRouter);
router.use("/settings", settingsRouter);

export default router;

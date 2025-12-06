import expressRouter from "express";
import userRouter from "./userRoutes.js";
import productRouter from "./productRoutes.js";
import saleRouter from "./saleRoutes.js";

const router = expressRouter();

router.use("/user", userRouter);
router.use("/product", productRouter);
router.use("/sale", saleRouter);

export default router;

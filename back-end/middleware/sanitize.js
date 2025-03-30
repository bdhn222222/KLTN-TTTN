import { JSDOM } from "jsdom";
import createDOMPurify from "dompurify";

const window = new JSDOM("").window;
const DOMPurify = createDOMPurify(window);

/**
 * Duyệt qua object (req.body, req.query, req.params) và làm sạch tất cả các giá trị dạng string
 */
const sanitizeObject = (obj) => {
  for (const key in obj) {
    if (typeof obj[key] === "string") {
      obj[key] = DOMPurify.sanitize(obj[key]);
    }
    // Nếu là object lồng, tiếp tục sanitize đệ quy
    if (typeof obj[key] === "object" && obj[key] !== null) {
      sanitizeObject(obj[key]);
    }
  }
};

const sanitizeInput = (req, res, next) => {
  sanitizeObject(req.body);
  sanitizeObject(req.query);
  sanitizeObject(req.params);
  next();
};

export default sanitizeInput;

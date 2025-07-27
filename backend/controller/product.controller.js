import { redis } from "../lib/redis.js";
import Product from "../models/product.model.js";
import cloudinary from "../lib/cloudinary.js";

export const getAllProducts = async (req, res) => {
  try {
    const products = await Product.find({});
    res.status(200).json({ products });
  } catch (error) {
    console.log("Error in getAllProducts controller", error);
    res
      .status(500)
      .json({ message: "Error fetching all products", error: error.message });
  }
};

export const getFeaturedProducts = async (req, res) => {
  try {
    let featuredProducts = await redis.get("featured_products");
    if (!featuredProducts) {
      //.lean() converts the Mongoose document to a plain JavaScript object, which is good for performance
      featuredProducts = await Product.find({ isFeatured: true }).lean();
      if (!featuredProducts) {
        return res.status(404).json({ message: "No featured products found" });
      }
      await redis.set("featured_products", JSON.stringify(featuredProducts));
    }
    const products = JSON.parse(featuredProducts);
    res.status(200).json({ products });
  } catch (error) {
    console.log("Error in getFeaturedProducts controller", error);
    res.status(500).json({
      message: "Error fetching featured products",
      error: error.message,
    });
  }
};

export const createProduct = async (req, res) => {
  try {
    const { name, description, price, image, category } = req.body;
    let cloudinaryResponse;
    if (image) {
      cloudinaryResponse = await cloudinary.uploader.upload(image, {
        folder: "products",
      });
    }
    const product = await Product.create({
      name,
      description,
      price,
      image: cloudinaryResponse?.secure_url,
      category,
    });
    res.status(201).json(product);
  } catch (error) {
    console.log("Error in createProduct controller", error);
    res
      .status(500)
      .json({ message: "Error creating product", error: error.message });
  }
};

export const deleteProduct = async (req, res) => {
  try {
    const productId = req.params.id;
    const product = await Product.findByIdAndDelete(productId);
    if (!product) {
      return res.status(404).json({ message: "Product not found" });
    }
    if (product.image) {
      const publicId = product.image.split("/").pop().split(".")[0];
      try {
        await cloudinary.uploader.destroy(`products/${publicId}`);
        console.log("Image deleted from cloudinary");
      } catch (error) {
        console.log("Error in deleting image from cloudinary", error);
      }
    }
    res.status(200).json({ message: "Product deleted successfully" });
  } catch (error) {
    console.log("Error in deleteProduct controller", error);
    res
      .status(500)
      .json({ message: "Error deleting product", error: error.message });
  }
};

export const getRecommendedProducts = async (req, res) => {
  try {
    const products = await Product.aggregate([
      {
        $sample: { size: 3 },
      },
      {
        $project: {
          _id: 1,
          name: 1,
          description: 1,
          image: 1,
          price: 1,
        },
      },
    ]);
    res.status(200).json({ products });
  } catch (error) {
    console.log("Error in getRecommendedProducts controller", error);
    res.status(500).json({
      message: "Error fetching recommended products",
      error: error.message,
    });
  }
};

export const getProductsByCategory = async (req, res) => {
  const { category } = req.params;
  try {
    const products = await Product.find({ category });
    res.status(200).json({ products });
  } catch (error) {
    console.log("Error in getProductsByCategory controller", error);
    res.status(500).json({
      message: "Error fetching products by category",
      error: error.message,
    });
  }
};

export const toggleFeaturedProduct = async (req, res) => {
  try {
    const productId = req.params.id;
    const product = await Product.findById(productId);
    if (!product) {
      return res.status(404).json({ message: "Product not found" });
    }
    product.isFeatured = !product.isFeatured;
    const updatedProduct = await product.save();
    await updatedProductCache();
    res.status(200).json({ updatedProduct });
  } catch (error) {
    console.log("Error in toggleFeaturedProduct controller", error);
    res.status(500).json({
      message: "Error toggling featured status of product",
      error: error.message,
    });
  }
};

async function updatedProductCache() {
  try {
    const featuredProducts = await Product.find({ isFeatured: true }).lean();
    await redis.set("featured_products", JSON.stringify(featuredProducts));
  } catch (error) {
    console.log("Error in updating product cache", error);
  }
}

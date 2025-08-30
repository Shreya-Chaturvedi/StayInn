const Listing = require("../models/listing.js");
const mbxGeocoding = require("@mapbox/mapbox-sdk/services/geocoding");
const mapToken = process.env.MAP_TOKEN;
const geocodingClient = mbxGeocoding({ accessToken: mapToken });

module.exports.index = async (req, res) => {
  const { category } = req.query;
  let query = {};

  if (category) {
    query.category = category;
  }
  const allListings = await Listing.find(query);
  res.render("listings/index.ejs", { allListings, category });
};

module.exports.renderNewform = (req, res) => {
  res.render("listings/new.ejs");
};

module.exports.showListing = async (req, res) => {
  let { id } = req.params;
  const listing = await Listing.findById(id)
    .populate({ path: "reviews", populate: { path: "author" } })
    .populate("owner");
  if (!listing) {
    req.flash("error", "Requested listing does not exist!");
    res.redirect("/listings");
  }
  res.render("listings/show.ejs", { listing });
};

module.exports.createListing = async (req, res, next) => {
  // let response = await geocodingClient
  //   .forwardGeocode({
  //     query: req.body.listing.location,
  //     limit: 1,
  //   })
  //   .send();

  let url = req.file.path;
  let filename = req.path.filename;
  const newListing = new Listing(req.body.listing);
  newListing.owner = req.user._id;
  newListing.image = { url, filename };
  // newListing.geometry = response.body.features[0].geometry;
  let savedListing = await newListing.save();
  console.log(savedListing);
  req.flash("success", "New Listing Created!");
  res.redirect("/listings");
};

module.exports.renderEditForm = async (req, res) => {
  let { id } = req.params;
  const listing = await Listing.findById(id);
  if (!listing) {
    req.flash("error", "Requested listing does not exist!");
    res.redirect("/listings");
  }
  let originalImageUrl = listing.image.url;
  originalImageUrl = originalImageUrl.replace("/upload", "/upload/w_250");
  res.render("listings/edit.ejs", { listing, originalImageUrl });
};

module.exports.updateListing = async (req, res) => {
  let { id } = req.params;
  let listing = await Listing.findByIdAndUpdate(id, { ...req.body.listing });

  if (typeof req.file !== "undefined") {
    let url = req.file.path;
    let filename = req.path.filename;
    listing.image = { url, filename };
    await listing.save();
  }
  req.flash("success", "Listing Updated!");
  res.redirect(`/listings/${id}`);
};

module.exports.destroyListing = async (req, res) => {
  let { id } = req.params;
  await Listing.findByIdAndDelete(id);
  req.flash("success", "Listing Deleted!");
  res.redirect("/listings");
};

module.exports.searchListings = async (req, res) => {
  const { query } = req.body; // 🛑 POST request me req.body se data milega
  let searchFilters = {};

  // 🛑 Agar query aayi hai, to title, location, ya country me dhundho
  if (query) {
    searchFilters.$or = [
      { title: { $regex: query, $options: "i" } },
      { location: { $regex: query, $options: "i" } },
      { country: { $regex: query, $options: "i" } },
    ];
  }

  const searchResults = await Listing.find(searchFilters);
  res.render("listings/search.ejs", { searchResults, query });
};

module.exports.myListings = async (req, res) => {
  const listings = await Listing.find({ owner: req.user._id }).populate({
    path: "reviews",
    populate: { path: "author" },
  });

  let positive = 0,
    negative = 0,
    neutral = 0;

  // Optional: Calculate overall sentiment per listing
  const listingsWithSentiment = listings.map((listing) => {
    let pos = 0,
      neg = 0,
      neu = 0;

    listing.reviews.forEach((r) => {
      if (r.sentiment === "Positive") {
        pos++;
        positive++;
      } else if (r.sentiment === "Negative") {
        neg++;
        negative++;
      } else {
        neu++;
        neutral++;
      }
    });

    let overall = "Neutral";
    if (pos > neg && pos > neu) overall = "Mostly Positive";
    else if (neg > pos && neg > neu) overall = "Mostly Negative";

    return { listing, overall };
  });

  // 👇 Ab global counts bhi bhej do EJS ko
  res.render("listings/myListings", {
    listingsWithSentiment,
    positive,
    negative,
    neutral,
  });
};

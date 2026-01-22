const isValidUuid = $input.first().json.isValidUuid;
const mimeTypes = $input.first().json.mimeTypes;
const supabaseUrl = "https://dbdqiqehuapcicejnzyd.supabase.co";
const supabaseKey = $env.SUPABASE_SERVICE_KEY;
const modelId = $input.first().json.modelId;
const userId = $input.first().json.userId;
const binary = $input.first().binary;

const frontImage = binary.front?.data;
const backImage = binary.back?.data;
const faceImage = binary.face?.data;

if (!frontImage || !backImage || !faceImage) {
  throw new Error("Imagens nao encontradas no binary data");
}

function getExtension(mimeType) {
  if (mimeType === "image/jpeg" || mimeType === "image/jpg") return ".jpg";
  if (mimeType === "image/png") return ".png";
  if (mimeType === "image/webp") return ".webp";
  return ".png";
}

async function uploadImage(base64Data, imageName, mimeType) {
  const buffer = Buffer.from(base64Data, "base64");
  const ext = getExtension(mimeType);
  const path = userId + "/" + modelId + "/" + imageName + ext;

  const response = await this.helpers.httpRequest({
    method: "POST",
    url: supabaseUrl + "/storage/v1/object/model-images/" + path,
    headers: {
      "Authorization": "Bearer " + supabaseKey,
      "Content-Type": mimeType,
      "x-upsert": "true"
    },
    body: buffer,
    encoding: "arraybuffer",
    returnFullResponse: true,
    ignoreHttpStatusErrors: true
  });

  if (response.statusCode >= 400) {
    console.log("Upload " + imageName + " error:", response.body);
    throw new Error("Upload failed: " + imageName + " - Status " + response.statusCode);
  }

  return supabaseUrl + "/storage/v1/object/public/model-images/" + path;
}

const frontMime = mimeTypes?.front || "image/png";
const backMime = mimeTypes?.back || "image/png";
const faceMime = mimeTypes?.face || "image/png";

const frontUrl = await uploadImage.call(this, frontImage, "front", frontMime);
const backUrl = await uploadImage.call(this, backImage, "back", backMime);
const faceUrl = await uploadImage.call(this, faceImage, "face", faceMime);

return [{
  json: {
    success: true,
    modelId: modelId,
    userId: userId,
    isValidUuid: isValidUuid,
    imageUrls: {
      front: frontUrl,
      back: backUrl,
      face: faceUrl
    }
  }
}];

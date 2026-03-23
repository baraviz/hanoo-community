import { createClientFromRequest } from 'npm:@base44/sdk@0.8.21';

/**
 * Upload report image file to the system
 * Accepts base64 or file data and returns the image URL
 */
Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    const body = await req.json();
    const fileData = body.file;
    
    if (!fileData) {
      return Response.json({ error: 'No file provided' }, { status: 400 });
    }

    // Convert base64 or file data to Blob
    const binaryString = atob(fileData.split(',')[1] || fileData);
    const bytes = new Uint8Array(binaryString.length);
    for (let i = 0; i < binaryString.length; i++) {
      bytes[i] = binaryString.charCodeAt(i);
    }
    const blob = new Blob([bytes], { type: 'image/jpeg' });

    // Upload file to Base44
    const uploadRes = await base44.integrations.Core.UploadFile({ file: blob });

    return Response.json({ url: uploadRes.file_url });
  } catch (error) {
    console.error(error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});
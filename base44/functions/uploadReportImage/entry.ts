import { createClientFromRequest } from 'npm:@base44/sdk@0.8.21';

/**
 * Upload report image file to the system
 * Returns the image URL
 */
Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    // Parse multipart form data
    const formData = await req.formData();
    const file = formData.get('file');
    
    if (!file) {
      return Response.json({ error: 'No file provided' }, { status: 400 });
    }

    // Upload file to Base44
    const uploadRes = await base44.integrations.Core.UploadFile({ file });

    return Response.json({ url: uploadRes.file_url });
  } catch (error) {
    console.error(error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});
package de.butzliftparts.konfigurator;

import android.annotation.SuppressLint;
import android.app.Activity;
import android.content.ContentValues;
import android.content.Intent;
import android.graphics.Color;
import android.net.Uri;
import android.os.Build;
import android.os.Bundle;
import android.os.Environment;
import android.provider.MediaStore;
import android.util.Base64;
import android.webkit.JavascriptInterface;
import android.webkit.MimeTypeMap;
import android.webkit.ValueCallback;
import android.webkit.WebChromeClient;
import android.webkit.WebResourceRequest;
import android.webkit.WebResourceResponse;
import android.webkit.WebSettings;
import android.webkit.WebView;
import android.webkit.WebViewClient;
import android.widget.Toast;

import java.io.ByteArrayInputStream;
import java.io.File;
import java.io.FileOutputStream;
import java.io.InputStream;
import java.io.OutputStream;
import java.net.URLConnection;
import java.util.HashMap;
import java.util.Map;

public class MainActivity extends Activity {
    private WebView webView;
    private ValueCallback<Uri[]> filePathCallback;
    private static final int FILE_CHOOSER = 1001;
    private static final String APP_HOST = "app.local";

    @SuppressLint({"SetJavaScriptEnabled", "JavascriptInterface"})
    @Override protected void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
        getWindow().setStatusBarColor(Color.rgb(29,53,87));
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.M) getWindow().setNavigationBarColor(Color.rgb(248,250,252));

        webView = new WebView(this);
        setContentView(webView);
        WebSettings s = webView.getSettings();
        s.setJavaScriptEnabled(true);
        s.setDomStorageEnabled(true);
        s.setDatabaseEnabled(true);
        s.setAllowFileAccess(false);
        s.setAllowContentAccess(true);
        s.setBuiltInZoomControls(false);
        s.setDisplayZoomControls(false);
        s.setLoadWithOverviewMode(false);
        s.setUseWideViewPort(true);
        s.setMediaPlaybackRequiresUserGesture(false);
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) s.setSafeBrowsingEnabled(true);
        webView.setBackgroundColor(Color.rgb(248,250,252));
        webView.addJavascriptInterface(new AndroidBridge(), "ButzAndroid");

        webView.setWebViewClient(new WebViewClient(){
            @Override public WebResourceResponse shouldInterceptRequest(WebView view, WebResourceRequest request){
                Uri u=request.getUrl();
                if (!APP_HOST.equals(u.getHost())) return null;
                String path=u.getPath();
                if (path==null || path.equals("/") || path.isEmpty()) path="/index.html";
                if (path.endsWith("/")) path += "index.html";
                path = path.replace("..", "");
                try {
                    InputStream in=getAssets().open("web"+path);
                    String mime=URLConnection.guessContentTypeFromName(path);
                    if(mime==null){
                        String ext=MimeTypeMap.getFileExtensionFromUrl(path);
                        mime=MimeTypeMap.getSingleton().getMimeTypeFromExtension(ext);
                    }
                    if(mime==null) mime="application/octet-stream";
                    Map<String,String> headers=new HashMap<>();
                    headers.put("Access-Control-Allow-Origin","*");
                    headers.put("Cache-Control","no-cache");
                    return new WebResourceResponse(mime,"UTF-8",200,"OK",headers,in);
                } catch(Exception ex){
                    return new WebResourceResponse("text/plain","UTF-8",404,"Not Found",new HashMap<>(),new ByteArrayInputStream("Not found".getBytes()));
                }
            }
            @Override public boolean shouldOverrideUrlLoading(WebView view, WebResourceRequest request){
                Uri u=request.getUrl();
                if(APP_HOST.equals(u.getHost())) return false;
                String scheme=u.getScheme();
                if("http".equals(scheme)||"https".equals(scheme)) return false;
                try { startActivity(new Intent(Intent.ACTION_VIEW,u)); return true; } catch(Exception ignored){ return false; }
            }
            @Override public void onPageFinished(WebView view,String url){
                super.onPageFinished(view,url);
                injectDownloadBridge();
            }
        });

        webView.setWebChromeClient(new WebChromeClient(){
            @Override public boolean onShowFileChooser(WebView webView, ValueCallback<Uri[]> cb, FileChooserParams params){
                if(filePathCallback!=null) filePathCallback.onReceiveValue(null);
                filePathCallback=cb;
                Intent i=params.createIntent();
                try { startActivityForResult(i,FILE_CHOOSER); return true; }
                catch(Exception e){ filePathCallback=null; return false; }
            }
        });
        webView.loadUrl("https://"+APP_HOST+"/index.html");
    }

    private void injectDownloadBridge(){
        String js="(function(){if(window.__butzDownloadBridge)return;window.__butzDownloadBridge=1;document.addEventListener('click',async function(e){var a=e.target.closest&&e.target.closest('a[download]');if(!a||!a.href)return;if(a.href.indexOf('blob:')!==0&&a.href.indexOf('data:')!==0)return;e.preventDefault();try{var data=a.href;if(a.href.indexOf('blob:')===0){var b=await fetch(a.href).then(r=>r.blob());data=await new Promise((res,rej)=>{var fr=new FileReader();fr.onload=()=>res(fr.result);fr.onerror=rej;fr.readAsDataURL(b);});}ButzAndroid.saveBase64File(String(data),a.download||'Butz-Export');}catch(err){console.error(err);}},true);})();";
        webView.evaluateJavascript(js,null);
    }

    public class AndroidBridge {
        @JavascriptInterface public void saveBase64File(String dataUrl,String filename){
            runOnUiThread(()->{
                try{
                    int comma=dataUrl.indexOf(',');
                    if(comma<0) throw new Exception("Ungültige Datei");
                    String meta=dataUrl.substring(0,comma);
                    String mime="application/octet-stream";
                    if(meta.startsWith("data:")){int semi=meta.indexOf(';'); if(semi>5) mime=meta.substring(5,semi);}
                    byte[] bytes=Base64.decode(dataUrl.substring(comma+1),Base64.DEFAULT);
                    String safe=(filename==null||filename.trim().isEmpty())?"Butz-Export":filename.replaceAll("[\\\\/:*?\"<>|]","_");
                    if(Build.VERSION.SDK_INT>=29){
                        ContentValues v=new ContentValues();v.put(MediaStore.Downloads.DISPLAY_NAME,safe);v.put(MediaStore.Downloads.MIME_TYPE,mime);v.put(MediaStore.Downloads.RELATIVE_PATH,Environment.DIRECTORY_DOWNLOADS+"/Butz-Liftparts");
                        Uri uri=getContentResolver().insert(MediaStore.Downloads.EXTERNAL_CONTENT_URI,v);if(uri==null)throw new Exception("Download konnte nicht angelegt werden");try(OutputStream out=getContentResolver().openOutputStream(uri)){out.write(bytes);}Toast.makeText(MainActivity.this,"Gespeichert: Downloads/Butz-Liftparts/"+safe,Toast.LENGTH_LONG).show();
                    } else {
                        File dir=getExternalFilesDir(Environment.DIRECTORY_DOWNLOADS);if(dir==null)dir=getFilesDir();File f=new File(dir,safe);try(OutputStream out=new FileOutputStream(f)){out.write(bytes);}Toast.makeText(MainActivity.this,"Gespeichert: "+f.getAbsolutePath(),Toast.LENGTH_LONG).show();
                    }
                }catch(Exception ex){Toast.makeText(MainActivity.this,"Speichern fehlgeschlagen: "+ex.getMessage(),Toast.LENGTH_LONG).show();}
            });
        }
    }

    @Override protected void onActivityResult(int requestCode,int resultCode,Intent data){
        super.onActivityResult(requestCode,resultCode,data);
        if(requestCode==FILE_CHOOSER && filePathCallback!=null){
            Uri[] result=null;
            if(resultCode==RESULT_OK && data!=null){
                if(data.getClipData()!=null){int n=data.getClipData().getItemCount();result=new Uri[n];for(int i=0;i<n;i++)result[i]=data.getClipData().getItemAt(i).getUri();}
                else if(data.getData()!=null) result=new Uri[]{data.getData()};
            }
            filePathCallback.onReceiveValue(result);filePathCallback=null;
        }
    }

    @Override public void onBackPressed(){
        if(webView!=null && webView.canGoBack()) webView.goBack(); else super.onBackPressed();
    }
}

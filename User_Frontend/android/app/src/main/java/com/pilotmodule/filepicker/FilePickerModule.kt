package com.pilotmodule.filepicker

import android.app.Activity
import android.content.Intent
import android.net.Uri
import android.provider.OpenableColumns
import com.facebook.react.bridge.ActivityEventListener
import com.facebook.react.bridge.BaseActivityEventListener
import com.facebook.react.bridge.Promise
import com.facebook.react.bridge.ReactApplicationContext
import com.facebook.react.bridge.ReactContextBaseJavaModule
import com.facebook.react.bridge.ReactMethod
import com.facebook.react.bridge.WritableMap
import com.facebook.react.bridge.Arguments
import java.io.File
import java.io.FileOutputStream

class FilePickerModule(reactContext: ReactApplicationContext) : ReactContextBaseJavaModule(reactContext) {

    private var pickerPromise: Promise? = null
    private val PICK_FILE_REQUEST_CODE = 41279

    private val activityEventListener: ActivityEventListener = object : BaseActivityEventListener() {
        override fun onActivityResult(activity: Activity, requestCode: Int, resultCode: Int, data: Intent?) {
            if (requestCode == PICK_FILE_REQUEST_CODE) {
                if (pickerPromise == null) return

                if (resultCode == Activity.RESULT_CANCELED) {
                    pickerPromise?.resolve(null)
                    pickerPromise = null
                    return
                }

                if (resultCode == Activity.RESULT_OK && data != null) {
                    val uri: Uri? = data.data
                    if (uri != null) {
                        try {
                            val result = copyFileToCacheAndGetDetails(uri)
                            pickerPromise?.resolve(result)
                        } catch (e: Exception) {
                            pickerPromise?.reject("PICKER_ERROR", "Failed to process selected file: ${e.message}", e)
                        }
                    } else {
                        pickerPromise?.resolve(null)
                    }
                    pickerPromise = null
                } else {
                    pickerPromise?.resolve(null)
                    pickerPromise = null
                }
            }
        }
    }

    init {
        reactContext.addActivityEventListener(activityEventListener)
    }

    override fun getName(): String = "NativeFilePicker"

    @ReactMethod
    fun pickDocument(promise: Promise) {
        val currentActivity = reactApplicationContext.currentActivity
        if (currentActivity == null) {
            promise.reject("NO_ACTIVITY", "Current activity does not exist")
            return
        }

        pickerPromise = promise

        val intent = Intent(Intent.ACTION_GET_CONTENT).apply {
            type = "*/*"
            val mimeTypes = arrayOf(
                "application/pdf",
                "image/jpeg",
                "image/jpg",
                "image/png",
                "image/webp"
            )
            putExtra(Intent.EXTRA_MIME_TYPES, mimeTypes)
            addCategory(Intent.CATEGORY_OPENABLE)
        }

        try {
            currentActivity.startActivityForResult(
                Intent.createChooser(intent, "Select Document"),
                PICK_FILE_REQUEST_CODE
            )
        } catch (e: Exception) {
            pickerPromise?.reject("ACTIVITY_START_ERROR", "Could not start file picker: ${e.message}", e)
            pickerPromise = null
        }
    }

    private fun copyFileToCacheAndGetDetails(uri: Uri): WritableMap {
        val contentResolver = reactApplicationContext.contentResolver
        var fileName = "document_${System.currentTimeMillis()}"
        var fileSize = 0L

        contentResolver.query(uri, null, null, null, null)?.use { cursor ->
            if (cursor.moveToFirst()) {
                val nameIndex = cursor.getColumnIndex(OpenableColumns.DISPLAY_NAME)
                val sizeIndex = cursor.getColumnIndex(OpenableColumns.SIZE)
                if (nameIndex >= 0) {
                    fileName = cursor.getString(nameIndex) ?: fileName
                }
                if (sizeIndex >= 0) {
                    fileSize = cursor.getLong(sizeIndex)
                }
            }
        }

        val mimeType = contentResolver.getType(uri) ?: "application/octet-stream"

        // Copy content to app cache dir so it has a stable file:// URI accessible by FormData
        val cacheDir = File(reactApplicationContext.cacheDir, "picked_documents")
        if (!cacheDir.exists()) {
            cacheDir.mkdirs()
        }

        val destFile = File(cacheDir, "${System.currentTimeMillis()}_${fileName}")
        contentResolver.openInputStream(uri)?.use { inputStream ->
            FileOutputStream(destFile).use { outputStream ->
                inputStream.copyTo(outputStream)
            }
        }

        if (fileSize == 0L) {
            fileSize = destFile.length()
        }

        val map: WritableMap = Arguments.createMap()
        map.putString("uri", "file://${destFile.absolutePath}")
        map.putString("name", fileName)
        map.putString("type", mimeType)
        map.putDouble("size", fileSize.toDouble())
        return map
    }
}

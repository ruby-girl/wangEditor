/**
 * @description 上传视频
 * @author wangfupeng
 */

import Editor from '../../editor/index'
import { arrForEach, forEach, getRandom } from '../../utils/util'
import post from '../../editor/upload/upload-core'
import Progress from '../../editor/upload/progress'

export type ResType = {
    errno: number | string
    data: any
}

class uploadVideo {
    private editor: Editor

    constructor(editor: Editor) {
        this.editor = editor
    }

    /**
     * 提示信息
     * @param alertInfo alert info
     * @param debugInfo debug info
     */
    private alert(alertInfo: string, debugInfo?: string): void {
        const customAlert = this.editor.config.customAlert
        if (customAlert) {
            customAlert(alertInfo)
        } else {
            window.alert(alertInfo)
        }

        if (debugInfo) {
            console.error('wangEditor: ' + debugInfo)
        }
    }

    /**
     * 往编辑区域插入图片
     * @param link 图片地址
     */
    public insertImg(link: string): void {
        const editor = this.editor
        const config = editor.config

        const i18nPrefix = 'validate.'
        const t = (text: string, prefix: string = i18nPrefix): string => {
            return editor.i18next.t(prefix + text)
        }

        // 先插入图片，无论是否能成功
        editor.cmd.do(
            'insertHTML',
            `<video src="${link}" controls style="max-width:100%;"></video>`
        )
        // 执行回调函数
        config.linkImgCallback(link)

        // 加载图片
        let video: any = document.createElement('video')
        video.onload = () => {
            video = null
        }
        video.onerror = () => {
            this.alert(
                t('插入视频错误'),
                `wangEditor: ${t('插入视频错误')}，${t('视频链接')} "${link}"，${t('下载视频失败')}`
            )
            video = null
            return
        }
        video.onabort = () => (video = null)
        video.src = link
    }

    /**
     * 上传图片
     * @param files 文件列表
     */
    public uploadImg(files: FileList | File[]): void {
        if (!files.length) {
            return
        }

        const editor = this.editor
        const config = editor.config

        // ------------------------------ i18next ------------------------------

        const i18nPrefix = 'validate.'
        const t = (text: string): string => {
            return editor.i18next.t(i18nPrefix + text)
        }

        // ------------------------------ 获取配置信息 ------------------------------

        // 服务端地址
        let uploadImgServer = config.uploadImgServer
        // base64 格式
        const uploadImgShowBase64 = config.uploadImgShowBase64
        // 图片最大体积
        // 一次最多上传图片数量
        const maxLength = config.uploadImgMaxLength
        // 自定义 fileName
        const uploadFileName = config.uploadFileName
        // 自定义参数
        const uploadImgParams = config.uploadImgParams
        // 参数拼接到 url 中
        const uploadImgParamsWithUrl = config.uploadImgParamsWithUrl
        // 自定义 header
        const uploadImgHeaders = config.uploadImgHeaders
        // 钩子函数
        const hooks = config.uploadImgHooks
        // 上传图片超时时间
        const timeout = config.uploadImgTimeout
        // 跨域带 cookie
        const withCredentials = config.withCredentials
        // 自定义上传图片
        const customUploadVideo = config.customUploadVideo

        // ------------------------------ 验证文件信息 ------------------------------
        const resultFiles: File[] = []
        const errInfos: string[] = []
        arrForEach(files, file => {
            const name = file.name
            const size = file.size

            // chrome 低版本 name === undefined
            if (!name || !size) {
                return
            }

            if (/\.(mp4)$/i.test(name) === false) {
                // 后缀名不合法，不是图片
                errInfos.push(`只允许上传mp4格式`)
                return
            }

            // 验证通过的加入结果列表
            resultFiles.push(file)
        })

        if (resultFiles.length > maxLength) {
            this.alert(t('一次最多上传') + maxLength + t('张图片'))
            return
        }
        // ------------------------------ 自定义上传 ------------------------------
        if (customUploadVideo && typeof customUploadVideo === 'function') {
            customUploadVideo(resultFiles, this.insertImg.bind(this))

            // 阻止以下代码执行，重要！！！
            return
        }

        // ------------------------------ 上传图片 ------------------------------

        // 添加图片数据
        const formData = new FormData()
        resultFiles.forEach((file: File, index: number) => {
            let name = uploadFileName || file.name
            if (resultFiles.length > 1) {
                // 多个文件时，filename 不能重复
                name = name + (index + 1)
            } else {
                name = name + getRandom()
            }
            formData.append(name, file)
        })
        if (uploadImgServer) {
            // 添加自定义参数
            const uploadImgServerArr = uploadImgServer.split('#')
            uploadImgServer = uploadImgServerArr[0]
            const uploadImgServerHash = uploadImgServerArr[1] || ''
            forEach(uploadImgParams, (key: string, val: string) => {
                // 因使用者反应，自定义参数不能默认 encode ，由 v3.1.1 版本开始注释掉
                // val = encodeURIComponent(val)

                // 第一，将参数拼接到 url 中
                if (uploadImgParamsWithUrl) {
                    if (uploadImgServer.indexOf('?') > 0) {
                        uploadImgServer += '&'
                    } else {
                        uploadImgServer += '?'
                    }
                    uploadImgServer = uploadImgServer + key + '=' + val
                }

                // 第二，将参数添加到 formData 中
                formData.append(key, val)
            })
            if (uploadImgServerHash) {
                uploadImgServer += '#' + uploadImgServerHash
            }

            // 开始上传
            const xhr = post(uploadImgServer, {
                timeout,
                formData,
                headers: uploadImgHeaders,
                withCredentials: !!withCredentials,
                beforeSend: xhr => {
                    if (hooks.before) return hooks.before(xhr, editor, resultFiles)
                },
                onTimeout: xhr => {
                    this.alert(t('上传视频超时'))
                    if (hooks.timeout) hooks.timeout(xhr, editor)
                },
                onProgress: (percent, e) => {
                    const progressBar = new Progress(editor)
                    if (e.lengthComputable) {
                        percent = e.loaded / e.total
                        progressBar.show(percent)
                    }
                },
                onError: xhr => {
                    this.alert(
                        t('上传视频错误'),
                        `${t('上传视频错误')}，${t('服务器返回状态')}: ${xhr.status}`
                    )
                    if (hooks.error) hooks.error(xhr, editor)
                },
                onFail: (xhr, resultStr) => {
                    this.alert(
                        t('上传视频失败'),
                        t('上传视频返回结果错误') + `，${t('返回结果')}: ` + resultStr
                    )
                    if (hooks.fail) hooks.fail(xhr, editor, resultStr)
                },
                onSuccess: (xhr, result: ResType) => {
                    if (hooks.customInsert) {
                        // 自定义插入图片
                        hooks.customInsert(this.insertImg.bind(this), result, editor)
                        return
                    }
                    if (result.errno != '0') {
                        // 返回格式不对，应该为 { errno: 0, data: [...] }
                        this.alert(
                            t('上传视频失败'),
                            `${t('上传视频返回结果错误')}，${t('返回结果')} errno=${result.errno}`
                        )
                        if (hooks.fail) hooks.fail(xhr, editor, result)
                        return
                    }

                    // 钩子函数
                    if (hooks.success) hooks.success(xhr, editor, result)
                },
            })
            if (typeof xhr === 'string') {
                // 上传被阻止
                this.alert(xhr)
            }

            // 阻止以下代码执行，重要！！！
            return
        }

        // ------------------------------ 显示 base64 格式 ------------------------------
        if (uploadImgShowBase64) {
            arrForEach(files, file => {
                const _this = this
                const reader = new FileReader()
                reader.readAsDataURL(file)
                reader.onload = function () {
                    if (!this.result) return
                    _this.insertImg(this.result.toString())
                }
            })
        }
    }
}

export default uploadVideo

@echo off
REM Manual Windows Batch File for modifying pennockprojects.com S3 objects after deploy
REM The .html files list was generated from:
REM    1. `npm run generate` 
REM    2. `dir /s *.html` in command (not powershell)
REM    3. Code editor to strip all non files away and convert `\` to `/` in file path

setlocal EnableDelayedExpansion

echo cp /*.html files to . ignoring index.html, 200.html, 404.html
aws s3 cp s3://pennockprojects.com/about.html s3://pennockprojects.com/about || (echo cp about failed & exit /b !ERRORLEVEL!)
aws s3 cp s3://pennockprojects.com/blog.html s3://pennockprojects.com/blog || (echo cp blog failed & exit /b !ERRORLEVEL!)
aws s3 cp s3://pennockprojects.com/cheats.html s3://pennockprojects.com/cheats || (echo cp cheats failed & exit /b !ERRORLEVEL!)
aws s3 cp s3://pennockprojects.com/license.html s3://pennockprojects.com/license || (echo cp license failed & exit /b !ERRORLEVEL!)
aws s3 cp s3://pennockprojects.com/projects.html s3://pennockprojects.com/projects || (echo cp projects failed & exit /b !ERRORLEVEL!)

echo rm /* .html files
aws s3 rm s3://pennockprojects.com/about.html || (echo rm about.html failed & exit /b !ERRORLEVEL!)
aws s3 rm s3://pennockprojects.com/blog.html || (echo rm blog.html failed & exit /b !ERRORLEVEL!)
aws s3 rm s3://pennockprojects.com/cheats.html || (echo rm cheats.html failed & exit /b !ERRORLEVEL!)
aws s3 rm s3://pennockprojects.com/license.html || (echo rm license.html failed & exit /b !ERRORLEVEL!)
aws s3 rm s3://pennockprojects.com/projects.html || (echo rm projects.html failed & exit /b !ERRORLEVEL!)

echo cp /about/*.html to .
aws s3 cp s3://pennockprojects.com/about/gitprojects.html s3://pennockprojects.com/about/gitprojects || (echo cp gitprojects.html failed & exit /b !ERRORLEVEL!)
aws s3 cp s3://pennockprojects.com/about/sitebuild.html s3://pennockprojects.com/about/sitebuild || (echo cp sitebuild.html failed & exit /b !ERRORLEVEL!)

echo rm /about/*.html
aws s3 rm s3://pennockprojects.com/about/gitprojects.html || (echo rm gitprojects.html failed & exit /b !ERRORLEVEL!)
aws s3 rm s3://pennockprojects.com/about/sitebuild.html || (echo rm sitebuild.html failed & exit /b !ERRORLEVEL!)

echo cp /blog/*.html -r to .
aws s3 cp s3://pennockprojects.com/blog/2024/awsdnsnameservers.html s3://pennockprojects.com/blog/2024/awsdnsnameservers || (echo cp awsdnsnameservers.html failed & exit /b !ERRORLEVEL!)
aws s3 cp s3://pennockprojects.com/blog/2024/hello.html s3://pennockprojects.com/blog/2024/hello || (echo cp hello.html failed & exit /b !ERRORLEVEL!)
aws s3 cp s3://pennockprojects.com/blog/2024/metadatanuxtcontentissuesblog.html s3://pennockprojects.com/blog/2024/metadatanuxtcontentissuesblog || (echo cp metadatanuxtcontentissuesblog.html failed & exit /b !ERRORLEVEL!)
aws s3 cp s3://pennockprojects.com/blog/2024/nuxtcontentcomponentimplement.html s3://pennockprojects.com/blog/2024/nuxtcontentcomponentimplement || (echo cp nuxtcontentcomponentimplement.html failed & exit /b !ERRORLEVEL!)
aws s3 cp s3://pennockprojects.com/blog/2024/nuxtuicontent.html s3://pennockprojects.com/blog/2024/nuxtuicontent || (echo cp nuxtuicontent.html failed & exit /b !ERRORLEVEL!)
aws s3 cp s3://pennockprojects.com/blog/2024/observer.html s3://pennockprojects.com/blog/2024/observer || (echo cp observer.html failed & exit /b !ERRORLEVEL!)
aws s3 cp s3://pennockprojects.com/blog/2024/tailwindresponsive.html s3://pennockprojects.com/blog/2024/tailwindresponsive || (echo cp tailwindresponsive.html failed & exit /b !ERRORLEVEL!)
aws s3 cp s3://pennockprojects.com/blog/2024/vueslotsblog.html s3://pennockprojects.com/blog/2024/vueslotsblog || (echo cp vueslotsblog.html failed & exit /b !ERRORLEVEL!)
aws s3 cp s3://pennockprojects.com/blog/2025/blogtojamstart.html s3://pennockprojects.com/blog/2025/blogtojamstart || (echo cp blogtojamstart.html failed & exit /b !ERRORLEVEL!)
aws s3 cp s3://pennockprojects.com/blog/2025/nuxtcontentupgrade.html s3://pennockprojects.com/blog/2025/nuxtcontentupgrade || (echo cp nuxtcontentupgrade.html failed & exit /b !ERRORLEVEL!)
aws s3 cp s3://pennockprojects.com/blog/2025/s3statichosting.html s3://pennockprojects.com/blog/2025/s3statichosting || (echo cp s3statichosting.html failed & exit /b !ERRORLEVEL!)
aws s3 cp s3://pennockprojects.com/blog/2025/solositedesign.html s3://pennockprojects.com/blog/2025/solositedesign || (echo cp solositedesign.html failed & exit /b !ERRORLEVEL!)
aws s3 cp s3://pennockprojects.com/blog/2025/tailwindcssscanning.html s3://pennockprojects.com/blog/2025/tailwindcssscanning || (echo cp tailwindcssscanning.html failed & exit /b !ERRORLEVEL!)
aws s3 cp s3://pennockprojects.com/blog/2025/s3_cicd.html s3://pennockprojects.com/blog/2025/s3_cicd || (echo cp s3_cicd.html failed & exit /b !ERRORLEVEL!)

echo rm /blog/*.html -r
aws s3 rm s3://pennockprojects.com/blog/2024/awsdnsnameservers.html || (echo rm awsdnsnameservers.html failed & exit /b !ERRORLEVEL!)
aws s3 rm s3://pennockprojects.com/blog/2024/hello.html || (echo rm hello.html failed & exit /b !ERRORLEVEL!)
aws s3 rm s3://pennockprojects.com/blog/2024/metadatanuxtcontentissuesblog.html || (echo rm metadatanuxtcontentissuesblog.html failed & exit /b !ERRORLEVEL!)
aws s3 rm s3://pennockprojects.com/blog/2024/nuxtcontentcomponentimplement.html || (echo rm nuxtcontentcomponentimplement.html failed & exit /b !ERRORLEVEL!)
aws s3 rm s3://pennockprojects.com/blog/2024/nuxtuicontent.html || (echo rm nuxtuicontent.html failed & exit /b !ERRORLEVEL!)
aws s3 rm s3://pennockprojects.com/blog/2024/observer.html || (echo rm observer.html failed & exit /b !ERRORLEVEL!)
aws s3 rm s3://pennockprojects.com/blog/2024/tailwindresponsive.html || (echo rm tailwindresponsive.html failed & exit /b !ERRORLEVEL!)
aws s3 rm s3://pennockprojects.com/blog/2024/vueslotsblog.html || (echo rm vueslotsblog.html failed & exit /b !ERRORLEVEL!)
aws s3 rm s3://pennockprojects.com/blog/2025/blogtojamstart.html || (echo rm blogtojamstart.html failed & exit /b !ERRORLEVEL!)
aws s3 rm s3://pennockprojects.com/blog/2025/nuxtcontentupgrade.html || (echo rm nuxtcontentupgrade.html failed & exit /b !ERRORLEVEL!)
aws s3 rm s3://pennockprojects.com/blog/2025/s3statichosting.html || (echo rm s3statichosting.html failed & exit /b !ERRORLEVEL!)
aws s3 rm s3://pennockprojects.com/blog/2025/solositedesign.html || (echo rm solositedesign.html failed & exit /b !ERRORLEVEL!)
aws s3 rm s3://pennockprojects.com/blog/2025/tailwindcssscanning.html || (echo rm tailwindcssscanning.html failed & exit /b !ERRORLEVEL!)
aws s3 rm s3://pennockprojects.com/blog/2025/s3_cicd.html || (echo rm s3_cicd.html failed & exit /b !ERRORLEVEL!)

echo cp /cheats/*.html -r
aws s3 cp s3://pennockprojects.com/cheats/devresources.html s3://pennockprojects.com/cheats/devresources || (echo cp devresources.html failed & exit /b !ERRORLEVEL!)
aws s3 cp s3://pennockprojects.com/cheats/emoji1.html s3://pennockprojects.com/cheats/emoji1 || (echo cp emoji1.html failed & exit /b !ERRORLEVEL!)
aws s3 cp s3://pennockprojects.com/cheats/emoji2.html s3://pennockprojects.com/cheats/emoji2 || (echo cp emoji2.html failed & exit /b !ERRORLEVEL!)
aws s3 cp s3://pennockprojects.com/cheats/git.html s3://pennockprojects.com/cheats/git || (echo cp git.html failed & exit /b !ERRORLEVEL!)
aws s3 cp s3://pennockprojects.com/cheats/markdown.html s3://pennockprojects.com/cheats/markdown || (echo cp markdown.html failed & exit /b !ERRORLEVEL!)
aws s3 cp s3://pennockprojects.com/cheats/metadatacheatsheet.html s3://pennockprojects.com/cheats/metadatacheatsheet || (echo cp metadatacheatsheet.html failed & exit /b !ERRORLEVEL!)
aws s3 cp s3://pennockprojects.com/cheats/nuxtcheat.html s3://pennockprojects.com/cheats/nuxtcheat || (echo cp nuxtcheat.html failed & exit /b !ERRORLEVEL!)
aws s3 cp s3://pennockprojects.com/cheats/nuxtcontentcheat.html s3://pennockprojects.com/cheats/nuxtcontentcheat || (echo cp nuxtcontentcheat.html failed & exit /b !ERRORLEVEL!)
aws s3 cp s3://pennockprojects.com/cheats/vueintro.html s3://pennockprojects.com/cheats/vueintro || (echo cp vueintro.html failed & exit /b !ERRORLEVEL!)
aws s3 cp s3://pennockprojects.com/cheats/vueslots.html s3://pennockprojects.com/cheats/vueslots || (echo cp vueslots.html failed & exit /b !ERRORLEVEL!)
aws s3 cp s3://pennockprojects.com/cheats/yaml.html s3://pennockprojects.com/cheats/yaml || (echo cp yaml.html failed & exit /b !ERRORLEVEL!)

echo rm /cheats/*.html -r
aws s3 rm s3://pennockprojects.com/cheats/devresources.html || (echo rm devresources.html failed & exit /b !ERRORLEVEL!)
aws s3 rm s3://pennockprojects.com/cheats/emoji1.html || (echo rm emoji1.html failed & exit /b !ERRORLEVEL!)
aws s3 rm s3://pennockprojects.com/cheats/emoji2.html || (echo rm emoji2.html failed & exit /b !ERRORLEVEL!)
aws s3 rm s3://pennockprojects.com/cheats/git.html || (echo rm git.html failed & exit /b !ERRORLEVEL!)
aws s3 rm s3://pennockprojects.com/cheats/markdown.html || (echo rm markdown.html failed & exit /b !ERRORLEVEL!)
aws s3 rm s3://pennockprojects.com/cheats/metadatacheatsheet.html || (echo rm metadatacheatsheet.html failed & exit /b !ERRORLEVEL!)
aws s3 rm s3://pennockprojects.com/cheats/nuxtcheat.html || (echo rm nuxtcheat.html failed & exit /b !ERRORLEVEL!)
aws s3 rm s3://pennockprojects.com/cheats/nuxtcontentcheat.html || (echo rm nuxtcontentcheat.html failed & exit /b !ERRORLEVEL!)
aws s3 rm s3://pennockprojects.com/cheats/vueintro.html || (echo rm vueintro.html failed & exit /b !ERRORLEVEL!)
aws s3 rm s3://pennockprojects.com/cheats/vueslots.html || (echo rm vueslots.html failed & exit /b !ERRORLEVEL!)
aws s3 rm s3://pennockprojects.com/cheats/yaml.html || (echo rm yaml.html failed & exit /b !ERRORLEVEL!)

echo cp /projects/*.html -r
aws s3 cp s3://pennockprojects.com/projects/jamstart.html s3://pennockprojects.com/projects/jamstart || (echo cp jamstart.html failed & exit /b !ERRORLEVEL!)
aws s3 cp s3://pennockprojects.com/projects/qrpdf.html s3://pennockprojects.com/projects/qrpdf || (echo cp qrpdf.html failed & exit /b !ERRORLEVEL!)
aws s3 cp s3://pennockprojects.com/projects/soloai.html s3://pennockprojects.com/projects/soloai || (echo cp soloai.html failed & exit /b !ERRORLEVEL!)
aws s3 cp s3://pennockprojects.com/projects/jamstart/builddeploy.html s3://pennockprojects.com/projects/jamstart/builddeploy || (echo cp builddeploy.html failed & exit /b !ERRORLEVEL!)
aws s3 cp s3://pennockprojects.com/projects/jamstart/contentcomponents.html s3://pennockprojects.com/projects/jamstart/contentcomponents || (echo cp contentcomponents.html failed & exit /b !ERRORLEVEL!)
aws s3 cp s3://pennockprojects.com/projects/jamstart/cookiefreeanalytics.html s3://pennockprojects.com/projects/jamstart/cookiefreeanalytics || (echo cp cookiefreeanalytics.html failed & exit /b !ERRORLEVEL!)
aws s3 cp s3://pennockprojects.com/projects/jamstart/copyclone.html s3://pennockprojects.com/projects/jamstart/copyclone || (echo cp copyclone.html failed & exit /b !ERRORLEVEL!)
aws s3 cp s3://pennockprojects.com/projects/jamstart/nuctcontentusage.html s3://pennockprojects.com/projects/jamstart/nuctcontentusage || (echo cp nuctcontentusage.html failed & exit /b !ERRORLEVEL!)
aws s3 cp s3://pennockprojects.com/projects/jamstart/nuxtusage.html s3://pennockprojects.com/projects/jamstart/nuxtusage || (echo cp nuxtusage.html failed & exit /b !ERRORLEVEL!)
aws s3 cp s3://pennockprojects.com/projects/jamstart/seometadata.html s3://pennockprojects.com/projects/jamstart/seometadata || (echo cp seometadata.html failed & exit /b !ERRORLEVEL!)
aws s3 cp s3://pennockprojects.com/projects/jamstart/styleslayoutnav.html s3://pennockprojects.com/projects/jamstart/styleslayoutnav || (echo cp styleslayoutnav.html failed & exit /b !ERRORLEVEL!)
aws s3 cp s3://pennockprojects.com/projects/jamstart/typographicprose.html s3://pennockprojects.com/projects/jamstart/typographicprose || (echo cp typographicprose.html failed & exit /b !ERRORLEVEL!)
aws s3 cp s3://pennockprojects.com/projects/jamstart/whatsincluded.html s3://pennockprojects.com/projects/jamstart/whatsincluded || (echo cp whatsincluded.html failed & exit /b !ERRORLEVEL!)
aws s3 cp s3://pennockprojects.com/projects/qrpdf/experiments/pdfview/dgt.html s3://pennockprojects.com/projects/qrpdf/experiments/pdfview/dgt || (echo cp dgt.html failed & exit /b !ERRORLEVEL!)
aws s3 cp s3://pennockprojects.com/projects/qrpdf/experiments/pdfview/dgt/Clorox.html s3://pennockprojects.com/projects/qrpdf/experiments/pdfview/dgt/Clorox || (echo cp dgt/Clorox.html failed & exit /b !ERRORLEVEL!)
aws s3 cp s3://pennockprojects.com/projects/qrpdf/experiments/pdfview/dgt/lakesammretail.html s3://pennockprojects.com/projects/qrpdf/experiments/pdfview/dgt/lakesammretail || (echo cp dgt/lakesammretail.html failed & exit /b !ERRORLEVEL!)
aws s3 cp s3://pennockprojects.com/projects/qrpdf/experiments/pdfview/dgt/riviera.html s3://pennockprojects.com/projects/qrpdf/experiments/pdfview/dgt/riviera || (echo cp dgt/riviera.html failed & exit /b !ERRORLEVEL!)
aws s3 cp s3://pennockprojects.com/projects/qrpdf/experiments/pdfview/dgt/Sharpie.html s3://pennockprojects.com/projects/qrpdf/experiments/pdfview/dgt/Sharpie || (echo cp dgt/Sharpie.html failed & exit /b !ERRORLEVEL!)
aws s3 cp s3://pennockprojects.com/projects/qrpdf/experiments/pdfview/dgt/WD40.html s3://pennockprojects.com/projects/qrpdf/experiments/pdfview/dgt/WD40 || (echo cp dgt/WD40.html failed & exit /b !ERRORLEVEL!)

echo rm /projects/*.html -r
aws s3 rm s3://pennockprojects.com/projects/jamstart.html || (echo rm jamstart.html failed & exit /b !ERRORLEVEL!)
aws s3 rm s3://pennockprojects.com/projects/qrpdf.html || (echo rm qrpdf.html failed & exit /b !ERRORLEVEL!)
aws s3 rm s3://pennockprojects.com/projects/soloai.html || (echo rm soloai.html failed & exit /b !ERRORLEVEL!)
aws s3 rm s3://pennockprojects.com/projects/jamstart/builddeploy.html || (echo rm builddeploy.html failed & exit /b !ERRORLEVEL!)
aws s3 rm s3://pennockprojects.com/projects/jamstart/contentcomponents.html || (echo rm contentcomponents.html failed & exit /b !ERRORLEVEL!)
aws s3 rm s3://pennockprojects.com/projects/jamstart/cookiefreeanalytics.html || (echo rm cookiefreeanalytics.html failed & exit /b !ERRORLEVEL!)
aws s3 rm s3://pennockprojects.com/projects/jamstart/copyclone.html || (echo rm copyclone.html failed & exit /b !ERRORLEVEL!)
aws s3 rm s3://pennockprojects.com/projects/jamstart/nuctcontentusage.html || (echo rm nuctcontentusage.html failed & exit /b !ERRORLEVEL!)
aws s3 rm s3://pennockprojects.com/projects/jamstart/nuxtusage.html || (echo rm nuxtusage.html failed & exit /b !ERRORLEVEL!)
aws s3 rm s3://pennockprojects.com/projects/jamstart/seometadata.html || (echo rm seometadata.html failed & exit /b !ERRORLEVEL!)
aws s3 rm s3://pennockprojects.com/projects/jamstart/styleslayoutnav.html || (echo rm styleslayoutnav.html failed & exit /b !ERRORLEVEL!)
aws s3 rm s3://pennockprojects.com/projects/jamstart/typographicprose.html || (echo rm typographicprose.html failed & exit /b !ERRORLEVEL!)
aws s3 rm s3://pennockprojects.com/projects/jamstart/whatsincluded.html || (echo rm whatsincluded.html failed & exit /b !ERRORLEVEL!)
aws s3 rm s3://pennockprojects.com/projects/qrpdf/experiments/pdfview/dgt.html || (echo rm html.html failed & exit /b !ERRORLEVEL!)
aws s3 rm s3://pennockprojects.com/projects/qrpdf/experiments/pdfview/dgt/Clorox.html || (echo rm dgt/Clorox.html failed & exit /b !ERRORLEVEL!)
aws s3 rm s3://pennockprojects.com/projects/qrpdf/experiments/pdfview/dgt/lakesammretail.html || (echo rm dgt/lakesammretail.html failed & exit /b !ERRORLEVEL!)
aws s3 rm s3://pennockprojects.com/projects/qrpdf/experiments/pdfview/dgt/riviera.html || (echo rm dgt/riviera.html failed & exit /b !ERRORLEVEL!)
aws s3 rm s3://pennockprojects.com/projects/qrpdf/experiments/pdfview/dgt/Sharpie.html || (echo rm dgt/Sharpie.html failed & exit /b !ERRORLEVEL!)
aws s3 rm s3://pennockprojects.com/projects/qrpdf/experiments/pdfview/dgt/WD40.html || (echo rm dgt/WD40.html failed & exit /b !ERRORLEVEL!)

echo All commands succeeded
endlocal
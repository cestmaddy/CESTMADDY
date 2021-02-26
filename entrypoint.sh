THEME=$1
THEME_REPO=$2

cp config.yml.original config.yml

if [[ -z ${THEME} && -z ${THEME_REPO} ]] ; then 
    echo Using clean theme;
else 
    rm -rd res/content/front/themes/${THEME};
    git clone ${THEME_REPO} res/content/front/themes/${THEME};
    sed -i "s?^.*theme:.*?  theme: \"${THEME}\"?g" config.yml; 
fi
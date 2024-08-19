from os import listdir
from os.path import isfile, join

import pandas as pd

folder_raw = 'data/special files/'
folder_cut = 'data/discord/'

files = [f for f in listdir(folder_raw) if isfile(join(folder_raw, f))]

for file in files:
    content = pd.read_csv(folder_raw+file, usecols=['Author', 'Date', 'Reactions'])

    index = 0
    for row in content['Reactions']:
        if type(row) == type(""):
            content.loc[index, 'Reactions'] = sum([int(''.join(filter(str.isdigit, r))) for r in row.split(',')])
        else:
            content.loc[index, 'Reactions'] = 0
        index += 1

    content.to_csv(folder_cut+file, index=False)

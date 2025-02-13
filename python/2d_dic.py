import spam.DIC
import numpy as np

def rgba2gray(rgba):
    r, g, b = rgba[:,:,0], rgba[:,:,1], rgba[:,:,2]
    gray = 0.2989 * r + 0.5870 * g + 0.1140 * b
    return gray

im1_arr = rgba2gray(np.array(im1).reshape(nx, ny, 4))
im2_arr = rgba2gray(np.array(im2).reshape(nx, ny, 4))

# Define the grid spacing
print("Making grid")
nodePositions, nodesDim = spam.DIC.makeGrid([1,nx,ny], int(nodeSpacing))
# print("nodePositions: ", nodePositions)
# print("nodesDim: ", nodesDim)
hws = np.array([0, int(nodeSpacing), int(nodeSpacing)])

print("Creating fake displacement")

# fake displacement
# im2_arr = np.roll(im1_arr, 1, axis=0)
# im2 = np.repeat(im2_arr, 4).reshape(nx, ny, 4)
# im2_flat = im2.flatten()

print("Running DIC")

PhiFieldOut, returnStatus, error, iterations, deltaPhiNorm = spam.DIC.ldic(im1_arr,im2_arr,nodePositions,hws,maxIterations=3)
PhiFieldOut = PhiFieldOut.reshape(*nodesDim, 4, 4)
# print("PhiFieldOut shape", PhiFieldOut.shape)
print("Finished DIC, running Geers")

FfieldGeers = spam.deformation.FfieldRegularGeersSlow(PhiFieldOut[:, :, :, 0:3, -1], np.array([0, int(nodeSpacing), int(nodeSpacing)]))
decomposedFfieldGeers = spam.deformation.decomposeFfield(FfieldGeers, ['e'])
# vol = decomposedFfieldGeers['vol']
# dev = decomposedFfieldGeers['dev']
# vol = np.repeat(vol, 4).reshape(nodesDim[1],nodesDim[2], 4).flatten()
# dev = np.repeat(dev, 4).reshape(nodesDim[1],nodesDim[2], 4).flatten()

e = decomposedFfieldGeers['e']
# print("e.shape", e.shape)
e_h = e[:,:,:,1,1].flatten() #np.repeat(e[:,:,:,1,2], 4).reshape(nodesDim[1],nodesDim[2], 4).flatten()
e_v = e[:,:,:,2,2].flatten() #np.repeat(e[:,:,:,2,1], 4).reshape(nodesDim[1],nodesDim[2], 4).flatten()

print("Finished Geers")
import { AxiosResponse } from 'axios'
import { createContext, ReactNode, useContext, useState } from 'react'
import { toast } from 'react-toastify'
import { api } from '../services/api'
import { Product, Stock } from '../types'

interface CartProviderProps {
  children: ReactNode
}

interface UpdateProductAmount {
  productId: number
  amount: number
}

interface CartContextData {
  cart: Product[]
  addProduct: (productId: number) => Promise<void>
  removeProduct: (productId: number) => void
  updateProductAmount: ({ productId, amount }: UpdateProductAmount) => void
}

const CartContext = createContext<CartContextData>({} as CartContextData)

const findProductById = async (productId: number): Promise<AxiosResponse<Product>> =>
  await api.get<Product>(`products/${productId}`)

const findStockByProductId = async (productId: number): Promise<AxiosResponse<Stock>> =>
  await api.get<Stock>(`stock/${productId}`)

export const CartProvider = ({ children }: CartProviderProps): JSX.Element => {
  const [cart, setCart] = useState<Product[]>(() => {
    const storagedCart = localStorage.getItem('@RocketShoes:cart')

    if (storagedCart) {
      return JSON.parse(storagedCart)
    }

    return []
  })

  const updateCartValues = (products: Product[]) => {
    setCart(products)
    localStorage.setItem('@RocketShoes:cart', JSON.stringify(products))
  }

  const addProduct = async (productId: number) => {
    try {
      const { data: productStock } = await findStockByProductId(productId)
        .catch(() => {
          throw new Error('Erro na adição do produto')
        })

      if (productStock.id !== productId) throw new Error('Quantidade solicitada fora de estoque')

      const { data: foundProduct } = await findProductById(productId)
        .catch(() => {
          throw new Error('Erro na adição do produto')
        })

      const product = cart.find(product => product.id === productId)

      if (product) {
        if (!(productStock.amount - product.amount - 1 < 0)) {
          updateCartValues(cart.map(product => {
            return product.id === productId ?
              { ...product, amount: product.amount + 1 } :
              product
          }))
        } else {
          throw new Error('Quantidade solicitada fora de estoque')
        }
      } else {
        if (!(productStock.amount - 1 < 0)) {
          updateCartValues([...cart, { ...foundProduct, amount: 1 }])
        } else {
          throw new Error('Quantidade solicitada fora de estoque')
        }
      }
    } catch(error) {
      toast.error(error.message)
    }
  }

  const removeProduct = (productId: number) => {
    try {
      const product = cart.find(product => product.id === productId)

      if (!product) throw new Error()

      updateCartValues(cart.filter(product => product.id !== productId))
    } catch {
      toast.error('Erro na remoção do produto')
    }
  }

  const updateProductAmount = async ({
    productId,
    amount,
  }: UpdateProductAmount) => {
    try {
      if (amount === 0) return

      const { data: productStock } = await findStockByProductId(productId)
        .catch(() => {
          throw new Error('Erro na alteração de quantidade do produto')
        })

      if (productStock.amount < amount) throw new Error('Quantidade solicitada fora de estoque')

      const product = cart.find(product => product.id === productId)

      if (product) {
        if (
          !(productStock.amount - product.amount - amount < 0) ||
          amount < product.amount
        ) {
          updateCartValues(cart.map(product => {
            return product.id === productId ?
              { ...product, amount: amount } :
              product
          }))
        } else {
          throw new Error('Quantidade solicitada fora de estoque')
        }
      }
    } catch(error) {
      toast.error(error.message)
    }
  }

  return (
    <CartContext.Provider
      value={{ cart, addProduct, removeProduct, updateProductAmount }}
    >
      {children}
    </CartContext.Provider>
  )
}

export function useCart(): CartContextData {
  const context = useContext(CartContext)

  return context
}
